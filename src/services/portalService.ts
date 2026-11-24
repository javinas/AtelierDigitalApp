// ==============================================================================
// ATELIER DIGITAL — SERVICIO: GESTIÓN Y CONTROL DEL PORTAL DE CLIENTAS (M09)
// Archivo: src/services/portalService.ts
// ==============================================================================
// Implementa la capa de acceso y mutación para el Centro de Control de Permisos
// de Katherine Carroll (M09-B) y la experiencia de clientas.
// Principio rector: Gobernanza Zero Trust (DEFAULT false).
// Identificación estricta de MODO DEMO cuando la migración 20261118000000_client_portal_m09.sql
// aún no ha sido aplicada en la base de datos remota de producción.
// ==============================================================================

import {
    FunctionsFetchError,
    FunctionsHttpError,
    FunctionsRelayError,
} from '@supabase/supabase-js';
import { supabase } from '../supabase';
import {
    AcceptPortalInvitationDTO,
    ClientPortalAccess,
    ClientPortalActivityLog,
    ClientPortalDashboardData,
    ClientPortalInvitation,
    ClientPortalPermission,
    ClientPortalSummary,
    CreatePortalInvitationDTO,
    DispatchPortalInvitationEmailDTO,
    IssuePortalInvitationDTO,
    IssuePortalInvitationResult,
    PORTAL_ACTIONS,
    PORTAL_CANONICAL_VIEWS,
    PORTAL_RESOURCES,
    PORTAL_TELEMETRY_EVENTS,
    PortalAccessStatus,
    PortalAction,
    PortalAppointmentView,
    PortalBatchRevokeResult,
    PortalCanonicalViewKey,
    PortalClientProfileView,
    PortalCommercialQuoteView,
    PortalCreationPermissionsProjection,
    PortalCreationView,
    PortalFittingSessionView,
    PortalIdentityGuardResult,
    PortalInvitationAcceptResult,
    PortalInvitationEmailDispatchResult,
    PortalInvitationFlowOutcome,
    PortalInvitationStatus,
    PortalInvitationVerifyResult,
    PortalMeasurementSessionView,
    PortalOperatingModeSnapshot,
    PortalPermissionMutationResult,
    PortalPermissionsProjection,
    PortalResource,
    PortalTelemetryEventType,
    PortalTelemetryLogResult,
    PortalViewReadResult,
    PortalViewReadStatus,
    ReissuePortalInvitationResult,
    RevokePortalInvitationResult,
    SetPortalPermissionDTO,
    UpdatePortalAccessStatusDTO,
} from '../types/portal';
import { isFittingRoundType, isFittingSessionStatus } from '../types/fitting';

// Estado de modo operativo del servicio (PostgREST y Edge Functions desacoplados)
let _lastPostgrestError: string | null = null;
let _postgrestDemoMode: boolean = false;
let _lastEdgeError: string | null = null;
let _edgeFunctionUnavailable: boolean = false;

export interface PortalPostgrestOptions {
    dbClient?: any;
}

// Repositorio en memoria para MODO DEMO / Pruebas Locales (Zero Trust, sin secretos ni tokens)
const inMemoryAccessMap = new Map<string, ClientPortalAccess>();
const inMemoryInvitationsMap = new Map<string, ClientPortalInvitation[]>();
const inMemoryPermissionsMap = new Map<string, ClientPortalPermission[]>();
const inMemoryActivityLogsMap = new Map<string, ClientPortalActivityLog[]>();
const permissionWriteQueue = new Map<string, Promise<unknown>>();
const inFlightEmailDispatches = new Map<string, Promise<PortalInvitationEmailDispatchResult>>();
const dispatchedEmailInvitationIds = new Set<string>();

export function resetPortalServiceOperatingModeForTests(options?: {
    clearInMemory?: boolean;
}): void {
    _lastPostgrestError = null;
    _postgrestDemoMode = false;
    _lastEdgeError = null;
    _edgeFunctionUnavailable = false;
    if (options?.clearInMemory) {
        inMemoryAccessMap.clear();
        inMemoryInvitationsMap.clear();
        inMemoryPermissionsMap.clear();
        inMemoryActivityLogsMap.clear();
        permissionWriteQueue.clear();
        inFlightEmailDispatches.clear();
        dispatchedEmailInvitationIds.clear();
    }
}

export function getPortalServiceOperatingMode(): PortalOperatingModeSnapshot {
    return {
        isDemoMode: _postgrestDemoMode,
        postgrestDemoMode: _postgrestDemoMode,
        edgeFunctionUnavailable: _edgeFunctionUnavailable,
        supabaseError: _lastPostgrestError,
        edgeFunctionError: _lastEdgeError,
        emailDeliveryPendingBackend: _postgrestDemoMode || _edgeFunctionUnavailable,
    };
}

const PORTAL_EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const PORTAL_ACTOR_UUID_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEMO_SYNTHETIC_ACTOR_UUID = '00000000-0000-4000-8000-000000000000';

const CREATION_SCOPED_ONLY_VIEW_RESOURCES = new Set<PortalResource>([
    'creations',
    'sketches',
    'fabrics',
    'fittings',
]);

export function isValidPortalResource(value: unknown): value is PortalResource {
    return typeof value === 'string' && (PORTAL_RESOURCES as readonly string[]).includes(value);
}

export function isValidPortalAction(value: unknown): value is PortalAction {
    return typeof value === 'string' && (PORTAL_ACTIONS as readonly string[]).includes(value);
}

function isValidActorUuid(value?: string | null): boolean {
    return typeof value === 'string' && PORTAL_ACTOR_UUID_REGEX.test(value.trim());
}

/**
 * Evalúa un permiso con paridad exacta respecto a public.has_portal_permission(p_resource, p_action, p_creation_id)
 * de M09-A v2.10:
 * 1) Exige estado 'active' cuando requireActiveAccess es true (equivalente a get_portal_access_id()).
 * 2) Si existe fila específica para creation_id != NULL, prevalece (override específico / deny-override).
 * 3) En su defecto aplica fila global (creation_id IS NULL); si no existe, retorna false (Zero Trust).
 */
export function evaluatePortalPermission(params: {
    accessStatus?: PortalAccessStatus | null;
    permissions: readonly ClientPortalPermission[];
    resource: PortalResource;
    action: PortalAction;
    creationId?: string | null;
    requireActiveAccess?: boolean;
}): boolean {
    const requireActive = params.requireActiveAccess ?? true;
    if (requireActive && params.accessStatus !== 'active') {
        return false;
    }
    if (!isValidPortalResource(params.resource) || !isValidPortalAction(params.action)) {
        return false;
    }

    if (params.creationId) {
        const specific = params.permissions.find(
            (p) =>
                p.creation_id === params.creationId &&
                p.resource === params.resource &&
                p.action === params.action
        );
        if (specific !== undefined) {
            return Boolean(specific.is_granted);
        }
    }

    const globalPerm = params.permissions.find(
        (p) =>
            p.creation_id === null &&
            p.resource === params.resource &&
            p.action === params.action
    );
    return globalPerm ? Boolean(globalPerm.is_granted) : false;
}

/**
 * Construye el modelo de lectura derivado en memoria únicamente desde public.client_portal_permissions
 * y public.client_portal_access (Única Fuente de Verdad; cero duplicación persistente).
 */
export function buildPortalPermissionsProjection(params: {
    access: ClientPortalAccess | null;
    permissions: readonly ClientPortalPermission[];
    creationIds?: readonly string[];
    requireActiveAccess?: boolean;
}): PortalPermissionsProjection {
    const requireActive = params.requireActiveAccess ?? true;
    const isAccessActive = Boolean(params.access && params.access.status === 'active');
    const canEvaluate = Boolean(params.access && (!requireActive || isAccessActive));

    const emptyGlobal = {
        measurementsView: false,
        appointmentsView: false,
        quotationsView: false,
        sketchesApprove: false,
        messagingObserve: false,
    };

    if (!canEvaluate || !params.access) {
        return {
            isAccessActive,
            globalModules: emptyGlobal,
            creationModules: {
                hasAnyVisibleCreation: false,
                visibleCreationIds: [],
                hasAnyVisibleFittings: false,
                fittingsCreationIds: [],
            },
            hasAnyAuthorizedModule: false,
            byCreationId: {},
        };
    }

    const perms = params.permissions;
    const status = params.access.status;

    const evalPerm = (
        resource: PortalResource,
        action: PortalAction,
        creationId: string | null = null
    ) =>
        evaluatePortalPermission({
            accessStatus: status,
            permissions: perms,
            resource,
            action,
            creationId,
            requireActiveAccess: requireActive,
        });

    const measurementsView = evalPerm('measurements', 'view', null);
    const appointmentsView = evalPerm('appointments', 'view', null);
    const quotationsView = evalPerm('quotations', 'view', null);
    const sketchesApproveGlobal = evalPerm('sketches', 'approve', null);
    const messagingObserveGlobal = evalPerm('messaging', 'observe', null);

    const creationIdSet = new Set<string>(params.creationIds || []);
    for (const p of perms) {
        if (p.creation_id) {
            creationIdSet.add(p.creation_id);
        }
    }

    const byCreationId: Record<string, PortalCreationPermissionsProjection> = {};
    const visibleCreationIds: string[] = [];
    const fittingsCreationIds: string[] = [];

    for (const cid of creationIdSet) {
        const canViewCreation = evalPerm('creations', 'view', cid);
        const canViewSketches = canViewCreation && evalPerm('sketches', 'view', cid);
        const canApproveSketches = canViewCreation && evalPerm('sketches', 'approve', cid);
        const canViewFabrics = canViewCreation && evalPerm('fabrics', 'view', cid);
        const canViewFittings = canViewCreation && evalPerm('fittings', 'view', cid);
        const canViewQuotations = canViewCreation && evalPerm('quotations', 'view', cid);
        const canSendObservations = canViewCreation && evalPerm('messaging', 'observe', cid);

        byCreationId[cid] = {
            creationId: cid,
            canViewCreation,
            canViewSketches,
            canApproveSketches,
            canViewFabrics,
            canViewFittings,
            canViewQuotations,
            canSendObservations,
        };

        if (canViewCreation) {
            visibleCreationIds.push(cid);
        }
        if (canViewFittings) {
            fittingsCreationIds.push(cid);
        }
    }

    const hasAnyVisibleCreation = visibleCreationIds.length > 0;
    const hasAnyVisibleFittings = fittingsCreationIds.length > 0;
    const hasAnyAuthorizedModule =
        hasAnyVisibleCreation ||
        hasAnyVisibleFittings ||
        measurementsView ||
        appointmentsView ||
        quotationsView;

    return {
        isAccessActive,
        globalModules: {
            measurementsView,
            appointmentsView,
            quotationsView,
            sketchesApprove: sketchesApproveGlobal,
            messagingObserve: messagingObserveGlobal,
        },
        creationModules: {
            hasAnyVisibleCreation,
            visibleCreationIds,
            hasAnyVisibleFittings,
            fittingsCreationIds,
        },
        hasAnyAuthorizedModule,
        byCreationId,
    };
}

function isPostgrestBackendUnavailableError(error: any): boolean {
    if (!error) return false;
    const code = String(error?.code || '').toUpperCase();
    const status = Number(error?.status || error?.statusCode || 0);
    const msg = String(error?.message || '').toLowerCase();

    if (
        code === 'PGRST205' ||
        code === 'PGRST106' ||
        code === '42P01' ||
        code === '42883'
    ) {
        return true;
    }
    if (status === 404 || status === 502 || status === 503 || status === 504) {
        return true;
    }
    return (
        msg.includes('could not find the table') ||
        msg.includes('does not exist') ||
        msg.includes('failed to fetch') ||
        msg.includes('network request failed') ||
        msg.includes('fetcherror')
    );
}

function isRlsUnauthorizedError(error: any): boolean {
    if (!error) return false;
    const code = String(error?.code || '').toUpperCase();
    const status = Number(error?.status || error?.statusCode || 0);
    const msg = String(error?.message || '').toLowerCase();
    return (
        code === '42501' ||
        status === 401 ||
        status === 403 ||
        msg.includes('row-level security') ||
        msg.includes('permission denied')
    );
}

function isPostgrestIntegrityOrDomainError(error: any): boolean {
    if (!error) return false;
    const code = String(error?.code || '').toUpperCase();
    return (
        code === '23505' ||
        code === '23514' ||
        code === '23503' ||
        code === '23502' ||
        code === '22P02' ||
        code === '22023' ||
        code === '42703' ||
        code === 'PGRST204'
    );
}

/**
 * Genera un acceso Zero Trust canónico (solo las 8 columnas de M09-A v2.10) en memoria DEMO.
 */
function createDefaultZeroTrustAccess(clientId: string): ClientPortalAccess {
    const now = new Date().toISOString();
    return {
        id: `cpa-demo-${clientId.slice(0, 8)}`,
        client_id: clientId,
        auth_user_id: null,
        status: 'invited',
        created_by: DEMO_SYNTHETIC_ACTOR_UUID,
        updated_by: null,
        created_at: now,
        updated_at: now,
    };
}

/**
 * Consulta identidad y ciclo de vida del portal de una clienta (solo columnas canónicas de client_portal_access).
 * Nunca activa MODO DEMO ante errores de autorización RLS (42501) o integridad.
 */
export async function fetchClientPortalAccess(
    clientId: string,
    options?: PortalPostgrestOptions
): Promise<ClientPortalAccess | null> {
    const db = options?.dbClient || supabase;
    try {
        const { data, error } = await db
            .from('client_portal_access')
            .select('*')
            .eq('client_id', clientId)
            .maybeSingle();

        if (!error) {
            _lastPostgrestError = null;
            _postgrestDemoMode = false;
            if (data) {
                inMemoryAccessMap.set(clientId, data as ClientPortalAccess);
                return data as ClientPortalAccess;
            }
            return null;
        }

        if (isRlsUnauthorizedError(error) || isPostgrestIntegrityOrDomainError(error)) {
            const authErr = new Error(error.message || 'Error de autorización o integridad consultando acceso.');
            (authErr as any).code = error.code || 'ERR';
            throw authErr;
        }

        _lastPostgrestError = `[Supabase ${error.code || 'ERR'}]: ${error.message}`;
        _postgrestDemoMode = true;
    } catch (err: any) {
        if (err && (err.code === '42501' || isRlsUnauthorizedError(err) || isPostgrestIntegrityOrDomainError(err))) {
            throw err;
        }
        _lastPostgrestError = `[Network/Client Error]: ${err?.message || String(err)}`;
        _postgrestDemoMode = true;
    }

    // Fallback MODO DEMO (exclusivamente cuando tablas PostgREST M09-A no están desplegadas o red falla)
    if (!inMemoryAccessMap.has(clientId)) {
        inMemoryAccessMap.set(clientId, createDefaultZeroTrustAccess(clientId));
    }
    return inMemoryAccessMap.get(clientId) || null;
}

/**
 * Actualiza exclusivamente el estado del acceso (invited/active/suspended/revoked) en public.client_portal_access.
 * - Exige UUID real del actor (updatedBy).
 * - Bloquea activación huérfana si auth_user_id es nulo (ORPHAN_ACTIVATION_BLOCKED).
 * - Jamás simula persistencia ni activa MODO DEMO ante errores RLS (42501) o integridad (23514/23503).
 */
export async function updatePortalAccessStatus(
    clientId: string,
    accessId: string,
    dto: UpdatePortalAccessStatusDTO,
    options?: PortalPostgrestOptions
): Promise<ClientPortalAccess> {
    if (!isValidActorUuid(dto.updatedBy)) {
        const actorErr = new Error(
            'Se requiere una sesión autenticada con UUID válido para modificar el estado del portal.'
        );
        (actorErr as any).code = 'UNAUTHORIZED_ACTOR';
        throw actorErr;
    }

    const db = options?.dbClient || supabase;
    const now = new Date().toISOString();

    if (dto.status === 'active') {
        let verifiedAuthUserId: string | null = null;
        let checkedRemote = false;

        try {
            const { data: currentRow, error: checkError } = await db
                .from('client_portal_access')
                .select('id, auth_user_id')
                .eq('id', accessId)
                .maybeSingle();

            if (!checkError) {
                checkedRemote = true;
                verifiedAuthUserId = (currentRow as ClientPortalAccess | null)?.auth_user_id || null;
            } else if (isRlsUnauthorizedError(checkError) || isPostgrestIntegrityOrDomainError(checkError)) {
                const rlsErr = new Error(checkError.message || 'Permiso denegado verificando acceso.');
                (rlsErr as any).code = checkError.code || '42501';
                throw rlsErr;
            }
        } catch (err: any) {
            if (err && (isRlsUnauthorizedError(err) || isPostgrestIntegrityOrDomainError(err))) {
                throw err;
            }
        }

        if (!checkedRemote) {
            const cached = inMemoryAccessMap.get(clientId);
            verifiedAuthUserId = cached && cached.id === accessId ? cached.auth_user_id : null;
        }

        if (!verifiedAuthUserId) {
            const guardErr = new Error(
                'No es posible activar el portal sin una cuenta vinculada (auth_user_id). La clienta debe aceptar primero su invitación privada.'
            );
            (guardErr as any).code = 'ORPHAN_ACTIVATION_BLOCKED';
            throw guardErr;
        }
    }

    try {
        const { data, error } = await db
            .from('client_portal_access')
            .update({
                status: dto.status,
                updated_by: dto.updatedBy.trim(),
                updated_at: now,
            })
            .eq('id', accessId)
            .select()
            .single();

        if (!error && data) {
            _lastPostgrestError = null;
            _postgrestDemoMode = false;
            inMemoryAccessMap.set(clientId, data as ClientPortalAccess);
            return data as ClientPortalAccess;
        }

        if (error) {
            if (isPostgrestBackendUnavailableError(error)) {
                _lastPostgrestError = `[Supabase ${error.code || 'ERR'}]: ${error.message}`;
                _postgrestDemoMode = true;
                const demoErr = new Error(
                    'MODO DEMO (Backend M09-A no disponible): no es posible persistir cambios de estado sin tablas autorizadas.'
                );
                (demoErr as any).code = 'BACKEND_UNAVAILABLE';
                throw demoErr;
            }

            const domainErr = new Error(error.message || 'Error actualizando el estado del portal.');
            (domainErr as any).code = error.code || 'ERR';
            throw domainErr;
        }
    } catch (err: any) {
        if (err?.code === 'BACKEND_UNAVAILABLE' || err?.code === 'ORPHAN_ACTIVATION_BLOCKED') {
            throw err;
        }
        if (isRlsUnauthorizedError(err) || isPostgrestIntegrityOrDomainError(err)) {
            throw err;
        }
        _lastPostgrestError = `[Update Error]: ${err?.message || String(err)}`;
        _postgrestDemoMode = true;
        const networkErr = new Error(
            'MODO DEMO (Backend M09-A no disponible): no es posible persistir cambios de estado sin conexión al backend.'
        );
        (networkErr as any).code = 'BACKEND_UNAVAILABLE';
        throw networkErr;
    }

    throw new Error('No se encontró el registro de acceso en el backend para actualizar.');
}

/**
 * Obtiene el historial de invitaciones de una clienta ordenado del más reciente al más antiguo.
 */
export async function fetchClientPortalInvitations(
    clientId: string,
    options?: PortalPostgrestOptions
): Promise<ClientPortalInvitation[]> {
    const db = options?.dbClient || supabase;
    try {
        const { data, error } = await db
            .from('client_portal_invitations')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false });

        if (!error && data) {
            _lastPostgrestError = null;
            _postgrestDemoMode = false;
            inMemoryInvitationsMap.set(clientId, data as ClientPortalInvitation[]);
            return data as ClientPortalInvitation[];
        }
        if (error) {
            if (isRlsUnauthorizedError(error) || isPostgrestIntegrityOrDomainError(error)) {
                throw error;
            }
            _lastPostgrestError = `[Supabase ${error.code || 'ERR'}]: ${error.message}`;
            _postgrestDemoMode = true;
        }
    } catch (err: any) {
        if (err && (isRlsUnauthorizedError(err) || isPostgrestIntegrityOrDomainError(err))) {
            throw err;
        }
        _lastPostgrestError = `[Network/Client Error]: ${err?.message || String(err)}`;
        _postgrestDemoMode = true;
    }

    return inMemoryInvitationsMap.get(clientId) || [];
}

// ==============================================================================
// MOTOR M09-B.5: EMISIÓN CRIPTOGRÁFICA, CICLO DE VIDA, REVOCACIÓN Y REEMISIÓN
// ==============================================================================

const BASE64URL_ALPHABET =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

function encodeBytesBase64Url(bytes: Uint8Array): string {
    let out = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i];
        const hasB1 = i + 1 < bytes.length;
        const hasB2 = i + 2 < bytes.length;
        const b1 = hasB1 ? bytes[i + 1] : 0;
        const b2 = hasB2 ? bytes[i + 2] : 0;

        out += BASE64URL_ALPHABET[b0 >> 2];
        out += BASE64URL_ALPHABET[((b0 & 0x03) << 4) | (b1 >> 4)];
        if (hasB1) {
            out += BASE64URL_ALPHABET[((b1 & 0x0f) << 2) | (b2 >> 6)];
        }
        if (hasB2) {
            out += BASE64URL_ALPHABET[b2 & 0x3f];
        }
    }
    return out;
}

/**
 * Genera un token criptográfico aleatorio (CSPRNG, 256 bits -> 43 caracteres base64url).
 * Jamás usa Math.random().
 */
export function generateCryptographicInviteToken(): string {
    const bytes = new Uint8Array(32);
    const webCrypto = (globalThis as { crypto?: { getRandomValues?: (arr: Uint8Array) => Uint8Array } })
        .crypto;

    if (webCrypto && typeof webCrypto.getRandomValues === 'function') {
        webCrypto.getRandomValues(bytes);
        return encodeBytesBase64Url(bytes);
    }

    throw new Error(
        'CSPRNG no disponible en el entorno actual; se aborta la generación del token por seguridad.'
    );
}

const SHA256_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
];

function sha256Utf8HexPureTs(message: string): string {
    const utf8Bytes: number[] = [];
    if (typeof TextEncoder !== 'undefined') {
        const encoded = new TextEncoder().encode(message);
        for (let i = 0; i < encoded.length; i += 1) {
            utf8Bytes.push(encoded[i]);
        }
    } else {
        const pct = encodeURIComponent(message);
        for (let i = 0; i < pct.length; i += 1) {
            if (pct[i] === '%') {
                utf8Bytes.push(parseInt(pct.slice(i + 1, i + 3), 16));
                i += 2;
            } else {
                utf8Bytes.push(pct.charCodeAt(i));
            }
        }
    }

    const bitLen = utf8Bytes.length * 8;
    utf8Bytes.push(0x80);
    while (utf8Bytes.length % 64 !== 56) {
        utf8Bytes.push(0);
    }

    const highBits = Math.floor(bitLen / 0x100000000);
    const lowBits = bitLen >>> 0;
    utf8Bytes.push(
        (highBits >>> 24) & 0xff,
        (highBits >>> 16) & 0xff,
        (highBits >>> 8) & 0xff,
        highBits & 0xff,
        (lowBits >>> 24) & 0xff,
        (lowBits >>> 16) & 0xff,
        (lowBits >>> 8) & 0xff,
        lowBits & 0xff
    );

    const h = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ];
    const w = new Array<number>(64);
    const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));

    for (let offset = 0; offset < utf8Bytes.length; offset += 64) {
        for (let i = 0; i < 16; i += 1) {
            const j = offset + i * 4;
            w[i] =
                ((utf8Bytes[j] << 24) |
                    (utf8Bytes[j + 1] << 16) |
                    (utf8Bytes[j + 2] << 8) |
                    utf8Bytes[j + 3]) >>>
                0;
        }
        for (let i = 16; i < 64; i += 1) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }

        let [a, b, c, d, e, f, g, hh] = h;
        for (let i = 0; i < 64; i += 1) {
            const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const temp1 = (hh + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
            const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (S0 + maj) >>> 0;

            hh = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }

        h[0] = (h[0] + a) >>> 0;
        h[1] = (h[1] + b) >>> 0;
        h[2] = (h[2] + c) >>> 0;
        h[3] = (h[3] + d) >>> 0;
        h[4] = (h[4] + e) >>> 0;
        h[5] = (h[5] + f) >>> 0;
        h[6] = (h[6] + g) >>> 0;
        h[7] = (h[7] + hh) >>> 0;
    }

    return h.map((val) => val.toString(16).padStart(8, '0')).join('');
}

/**
 * Calcula SHA-256 hexadecimal (64 chars minúsculos) compatible con encode(digest(..., 'sha256'), 'hex') de PostgreSQL.
 */
export async function computeSha256Hex(value: string): Promise<string> {
    const subtle = (
        globalThis as {
            crypto?: { subtle?: { digest?: (alg: string, data: BufferSource) => Promise<ArrayBuffer> } };
        }
    ).crypto?.subtle;

    if (subtle && typeof subtle.digest === 'function' && typeof TextEncoder !== 'undefined') {
        const bytes = new TextEncoder().encode(value);
        const digestBuffer = await subtle.digest('SHA-256', bytes);
        const hashBytes = new Uint8Array(digestBuffer);
        return Array.from(hashBytes)
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    }

    return sha256Utf8HexPureTs(value);
}

export function buildPortalInviteUrl(rawToken: string, explicitBaseUrl?: string): string {
    const cleanToken = encodeURIComponent(rawToken.trim());
    let base = (explicitBaseUrl || '').trim();
    if (!base && typeof window !== 'undefined' && window.location?.origin) {
        base = window.location.origin;
    }
    if (!base && typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_APP_URL) {
        base = process.env.EXPO_PUBLIC_APP_URL.trim();
    }
    const normalizedBase = base.replace(/\/+$/, '');
    return normalizedBase
        ? `${normalizedBase}/portal/invite?token=${cleanToken}`
        : `/portal/invite?token=${cleanToken}`;
}

export function isInvitationEffectivelyExpired(
    invitation: Pick<ClientPortalInvitation, 'status' | 'expires_at'>,
    nowMs: number = Date.now()
): boolean {
    if (invitation.status === 'expired') return true;
    if (invitation.status !== 'pending' && invitation.status !== 'processing') {
        return false;
    }
    const parsed = Date.parse(invitation.expires_at);
    return Number.isFinite(parsed) && parsed <= nowMs;
}

export function resolveInvitationDisplayStatus(
    invitation: Pick<ClientPortalInvitation, 'status' | 'expires_at'>,
    nowMs: number = Date.now()
): PortalInvitationStatus {
    if (invitation.status === 'pending' && isInvitationEffectivelyExpired(invitation, nowMs)) {
        return 'expired';
    }
    return invitation.status;
}

/**
 * Emite una invitación privada real según M09-A v2.10:
 * - Provisiona client_portal_access (Zero Trust) si aún no existe para la clienta.
 * - Genera token CSPRNG y persiste EXCLUSIVAMENTE su hash SHA-256 en client_portal_invitations.
 * - Devuelve oneTimeToken y oneTimeInviteUrl en memoria una única vez; jamás fabrica enlaces en DEMO.
 */
export async function issuePortalInvitation(
    dto: IssuePortalInvitationDTO,
    options?: PortalPostgrestOptions
): Promise<IssuePortalInvitationResult> {
    const db = options?.dbClient || supabase;
    const email = (dto.clientEmail || '').trim().toLowerCase();
    const invitedBy = (dto.invitedBy || '').trim();

    if (!PORTAL_EMAIL_REGEX.test(email)) {
        return {
            ok: false,
            outcome: 'invalid_email',
            invitation: null,
            portalAccess: null,
            oneTimeToken: null,
            oneTimeInviteUrl: null,
            emailDeliveryPendingBackend: true,
            message: 'Ingresa un correo electrónico válido para emitir la invitación privada.',
            environment: 'production',
            errorCode: 'INVALID_EMAIL',
        };
    }

    if (!isValidActorUuid(invitedBy)) {
        return {
            ok: false,
            outcome: 'unauthorized_actor',
            invitation: null,
            portalAccess: null,
            oneTimeToken: null,
            oneTimeInviteUrl: null,
            emailDeliveryPendingBackend: true,
            message: 'Se requiere una sesión autenticada de diseñadora o administración para emitir invitaciones.',
            environment: 'production',
            errorCode: 'UNAUTHORIZED_ACTOR',
        };
    }

    try {
        // 1. Verificar o provisionar client_portal_access (exclusivamente las columnas canónicas M09-A v2.10)
        const { data: existingAccess, error: accessSelectError } = await db
            .from('client_portal_access')
            .select('*')
            .eq('client_id', dto.clientId)
            .maybeSingle();

        if (accessSelectError) {
            if (isRlsUnauthorizedError(accessSelectError)) {
                return {
                    ok: false,
                    outcome: 'unauthorized_actor',
                    invitation: null,
                    portalAccess: null,
                    oneTimeToken: null,
                    oneTimeInviteUrl: null,
                    emailDeliveryPendingBackend: true,
                    message:
                        'Tu sesión actual no tiene permisos RLS (is_admin_or_designer) para gestionar el portal de clientas.',
                    environment: 'production',
                    errorCode: String(accessSelectError.code || '42501'),
                };
            }
            if (isPostgrestIntegrityOrDomainError(accessSelectError)) {
                return {
                    ok: false,
                    outcome: 'error',
                    invitation: null,
                    portalAccess: null,
                    oneTimeToken: null,
                    oneTimeInviteUrl: null,
                    emailDeliveryPendingBackend: true,
                    message: `Error de integridad consultando acceso del portal: ${accessSelectError.message}`,
                    environment: 'production',
                    errorCode: String(accessSelectError.code || '23514'),
                };
            }
            const detail = `[Supabase ${accessSelectError.code || 'ERR'}]: ${accessSelectError.message}`;
            _lastPostgrestError = detail;
            _postgrestDemoMode = true;
            return {
                ok: false,
                outcome: 'backend_unavailable',
                invitation: null,
                portalAccess: inMemoryAccessMap.get(dto.clientId) || null,
                oneTimeToken: null,
                oneTimeInviteUrl: null,
                emailDeliveryPendingBackend: true,
                message:
                    'MODO DEMO (Backend M09-A no disponible): no se generó ningún token ni enlace /portal/invite real.',
                environment: 'demo_unavailable',
                errorCode: String(accessSelectError.code || 'BACKEND_UNAVAILABLE'),
            };
        }

        let portalAccess = (existingAccess as ClientPortalAccess | null) || null;

        if (!portalAccess) {
            const nowIso = new Date().toISOString();
            const { data: createdAccess, error: accessInsertError } = await db
                .from('client_portal_access')
                .insert({
                    client_id: dto.clientId,
                    auth_user_id: null,
                    status: 'invited',
                    created_by: invitedBy,
                    updated_by: invitedBy,
                    updated_at: nowIso,
                })
                .select()
                .single();

            if (accessInsertError) {
                if (String(accessInsertError.code || '') === '23505') {
                    const { data: racedAccess } = await db
                        .from('client_portal_access')
                        .select('*')
                        .eq('client_id', dto.clientId)
                        .maybeSingle();
                    portalAccess = (racedAccess as ClientPortalAccess | null) || null;
                } else if (isRlsUnauthorizedError(accessInsertError)) {
                    return {
                        ok: false,
                        outcome: 'unauthorized_actor',
                        invitation: null,
                        portalAccess: null,
                        oneTimeToken: null,
                        oneTimeInviteUrl: null,
                        emailDeliveryPendingBackend: true,
                        message:
                            'Acceso denegado por RLS al provisionar el acceso Zero Trust de la clienta.',
                        environment: 'production',
                        errorCode: String(accessInsertError.code || '42501'),
                    };
                } else if (isPostgrestBackendUnavailableError(accessInsertError)) {
                    const detail = `[Supabase ${accessInsertError.code || 'ERR'}]: ${accessInsertError.message}`;
                    _lastPostgrestError = detail;
                    _postgrestDemoMode = true;
                    return {
                        ok: false,
                        outcome: 'backend_unavailable',
                        invitation: null,
                        portalAccess: inMemoryAccessMap.get(dto.clientId) || null,
                        oneTimeToken: null,
                        oneTimeInviteUrl: null,
                        emailDeliveryPendingBackend: true,
                        message:
                            'MODO DEMO (Backend M09-A no disponible): no se generó ningún token ni enlace /portal/invite real.',
                        environment: 'demo_unavailable',
                        errorCode: String(accessInsertError.code || 'BACKEND_UNAVAILABLE'),
                    };
                } else {
                    return {
                        ok: false,
                        outcome: 'error',
                        invitation: null,
                        portalAccess: null,
                        oneTimeToken: null,
                        oneTimeInviteUrl: null,
                        emailDeliveryPendingBackend: true,
                        message: `No se pudo provisionar el acceso de la clienta: ${accessInsertError.message}`,
                        environment: 'production',
                        errorCode: String(accessInsertError.code || 'ERR'),
                    };
                }
            } else {
                portalAccess = createdAccess as ClientPortalAccess;
            }
        }

        // 2. Generar token criptográfico y su hash SHA-256 sin almacenar el token en claro
        const rawToken = generateCryptographicInviteToken();
        const tokenHash = await computeSha256Hex(rawToken);
        const expiresInHours = Math.max(1, Math.min(dto.expiresInHours ?? 168, 24 * 30));
        const expiresAt = new Date(Date.now() + expiresInHours * 3600_000).toISOString();

        const { data: createdInvite, error: inviteError } = await db
            .from('client_portal_invitations')
            .insert({
                client_id: dto.clientId,
                email,
                token_hash: tokenHash,
                expires_at: expiresAt,
                used_at: null,
                status: 'pending',
                failure_reason: null,
                invited_by: invitedBy,
                lease_until: null,
                operation_id: null,
            })
            .select()
            .single();

        if (inviteError || !createdInvite) {
            if (isRlsUnauthorizedError(inviteError)) {
                return {
                    ok: false,
                    outcome: 'unauthorized_actor',
                    invitation: null,
                    portalAccess,
                    oneTimeToken: null,
                    oneTimeInviteUrl: null,
                    emailDeliveryPendingBackend: true,
                    message:
                        'Permiso denegado por RLS al emitir la invitación (se requiere rol admin o designer).',
                    environment: 'production',
                    errorCode: String(inviteError?.code || '42501'),
                };
            }
            if (isPostgrestBackendUnavailableError(inviteError)) {
                const detail = `[Supabase ${inviteError?.code || 'ERR'}]: ${inviteError?.message || 'Backend M09-A no disponible'}`;
                _lastPostgrestError = detail;
                _postgrestDemoMode = true;
                return {
                    ok: false,
                    outcome: 'backend_unavailable',
                    invitation: null,
                    portalAccess,
                    oneTimeToken: null,
                    oneTimeInviteUrl: null,
                    emailDeliveryPendingBackend: true,
                    message:
                        'MODO DEMO (Backend M09-A no disponible): no se generó ningún token ni enlace /portal/invite real.',
                    environment: 'demo_unavailable',
                    errorCode: String(inviteError?.code || 'BACKEND_UNAVAILABLE'),
                };
            }
            return {
                ok: false,
                outcome: String(inviteError?.code || '') === '23514' ? 'invalid_email' : 'error',
                invitation: null,
                portalAccess,
                oneTimeToken: null,
                oneTimeInviteUrl: null,
                emailDeliveryPendingBackend: true,
                message: `No se pudo registrar la invitación en el backend: ${inviteError?.message || 'Error desconocido'}`,
                environment: 'production',
                errorCode: String(inviteError?.code || 'ERR'),
            };
        }

        _lastPostgrestError = null;
        _postgrestDemoMode = false;

        if (portalAccess) {
            inMemoryAccessMap.set(dto.clientId, portalAccess);
        }
        const typedInvite = createdInvite as ClientPortalInvitation;
        const currentList = (inMemoryInvitationsMap.get(dto.clientId) || []).filter(
            (inv) => inv.id !== typedInvite.id
        );
        inMemoryInvitationsMap.set(dto.clientId, [typedInvite, ...currentList]);

        const oneTimeInviteUrl = buildPortalInviteUrl(rawToken, dto.baseUrl);

        return {
            ok: true,
            outcome: 'issued',
            invitation: typedInvite,
            portalAccess,
            oneTimeToken: rawToken,
            oneTimeInviteUrl,
            emailDeliveryPendingBackend: true,
            message:
                'Invitación emitida con hash SHA-256 guardado. Comparte este enlace único ahora: al cerrar la ventana no podrá volver a mostrarse.',
            environment: 'production',
        };
    } catch (err: any) {
        const detail = `[Network/Client Error]: ${err?.message || String(err)}`;
        _lastPostgrestError = detail;
        _postgrestDemoMode = true;
        return {
            ok: false,
            outcome: 'backend_unavailable',
            invitation: null,
            portalAccess: inMemoryAccessMap.get(dto.clientId) || null,
            oneTimeToken: null,
            oneTimeInviteUrl: null,
            emailDeliveryPendingBackend: true,
            message:
                'MODO DEMO (Backend M09-A no disponible): no se generó ningún token ni enlace /portal/invite real.',
            environment: 'demo_unavailable',
            errorCode: 'BACKEND_UNAVAILABLE',
        };
    }
}

/**
 * Revoca de forma atómica una invitación en estado 'pending' según M09-A v2.10
 * (chk_cpi_lease_state_consistency: status='revoked' y lease_until=null).
 * Jamás simula revocación en MODO DEMO.
 */
export async function revokePortalInvitation(
    invitationId: string,
    clientId: string,
    options?: PortalPostgrestOptions
): Promise<RevokePortalInvitationResult> {
    const db = options?.dbClient || supabase;
    try {
        const { data, error } = await db
            .from('client_portal_invitations')
            .update({
                status: 'revoked',
                lease_until: null,
            })
            .eq('id', invitationId)
            .eq('client_id', clientId)
            .eq('status', 'pending')
            .select()
            .maybeSingle();

        if (error) {
            if (isRlsUnauthorizedError(error)) {
                return {
                    ok: false,
                    outcome: 'unauthorized_actor',
                    invitation: null,
                    message:
                        'Permiso denegado por RLS al revocar la invitación (se requiere rol admin o designer).',
                    environment: 'production',
                    errorCode: String(error.code || '42501'),
                };
            }
            if (isPostgrestBackendUnavailableError(error)) {
                _lastPostgrestError = `[Supabase ${error.code || 'ERR'}]: ${error.message}`;
                _postgrestDemoMode = true;
                return {
                    ok: false,
                    outcome: 'backend_unavailable',
                    invitation: null,
                    message:
                        'MODO DEMO (Backend M09-A no disponible): no es posible revocar invitaciones sin conexión al backend autorizado.',
                    environment: 'demo_unavailable',
                    errorCode: String(error.code || 'BACKEND_UNAVAILABLE'),
                };
            }
            return {
                ok: false,
                outcome: 'error',
                invitation: null,
                message: `Error al revocar invitación: ${error.message}`,
                environment: 'production',
                errorCode: String(error.code || 'ERR'),
            };
        }

        _lastPostgrestError = null;
        _postgrestDemoMode = false;

        if (!data) {
            const { data: currentRow } = await db
                .from('client_portal_invitations')
                .select('*')
                .eq('id', invitationId)
                .eq('client_id', clientId)
                .maybeSingle();

            return {
                ok: false,
                outcome: 'already_finalized',
                invitation: (currentRow as ClientPortalInvitation | null) || null,
                message:
                    'Esta invitación ya cambió de estado (aceptada, en proceso, expirada o revocada previamente) y no admite revocación.',
                environment: 'production',
                errorCode: 'ALREADY_FINALIZED',
            };
        }

        const updatedInvite = data as ClientPortalInvitation;
        const currentList = inMemoryInvitationsMap.get(clientId) || [];
        inMemoryInvitationsMap.set(
            clientId,
            currentList.map((inv) => (inv.id === updatedInvite.id ? updatedInvite : inv))
        );

        return {
            ok: true,
            outcome: 'revoked',
            invitation: updatedInvite,
            message: 'Invitación revocada. El enlace anterior quedó invalidado.',
            environment: 'production',
        };
    } catch (err: any) {
        _lastPostgrestError = `[Network/Client Error]: ${err?.message || String(err)}`;
        _postgrestDemoMode = true;
        return {
            ok: false,
            outcome: 'backend_unavailable',
            invitation: null,
            message:
                'MODO DEMO (Backend M09-A no disponible): no es posible revocar invitaciones sin conexión al backend autorizado.',
            environment: 'demo_unavailable',
            errorCode: 'BACKEND_UNAVAILABLE',
        };
    }
}

/**
 * Reemite una invitación previa de forma secuencial y segura:
 * 1) Bloquea si la invitación previa está 'accepted' o 'processing'.
 * 2) Si está 'pending', la revoca atómicamente antes de emitir la nueva.
 * 3) Emite una nueva invitación criptográfica con enlace único de un solo uso.
 */
export async function reissuePortalInvitation(
    previousInvitationId: string,
    dto: IssuePortalInvitationDTO,
    options?: PortalPostgrestOptions
): Promise<ReissuePortalInvitationResult> {
    const db = options?.dbClient || supabase;
    try {
        const { data: previousInvite, error: lookupError } = await db
            .from('client_portal_invitations')
            .select('*')
            .eq('id', previousInvitationId)
            .eq('client_id', dto.clientId)
            .maybeSingle();

        if (lookupError) {
            if (isRlsUnauthorizedError(lookupError)) {
                return {
                    ok: false,
                    outcome: 'unauthorized_actor',
                    invitation: null,
                    portalAccess: null,
                    oneTimeToken: null,
                    oneTimeInviteUrl: null,
                    revokedPreviousInvitationId: null,
                    emailDeliveryPendingBackend: true,
                    message:
                        'Permiso denegado por RLS al verificar la invitación previa.',
                    environment: 'production',
                    errorCode: String(lookupError.code || '42501'),
                };
            }
            _lastPostgrestError = `[Supabase ${lookupError.code || 'ERR'}]: ${lookupError.message}`;
            _postgrestDemoMode = true;
            return {
                ok: false,
                outcome: 'backend_unavailable',
                invitation: null,
                portalAccess: null,
                oneTimeToken: null,
                oneTimeInviteUrl: null,
                revokedPreviousInvitationId: null,
                emailDeliveryPendingBackend: true,
                message:
                    'MODO DEMO (Backend M09-A no disponible): no es posible reemitir invitaciones reales sin backend autorizado.',
                environment: 'demo_unavailable',
                errorCode: String(lookupError.code || 'BACKEND_UNAVAILABLE'),
            };
        }

        const prev = (previousInvite as ClientPortalInvitation | null) || null;
        if (prev && (prev.status === 'accepted' || prev.status === 'processing')) {
            return {
                ok: false,
                outcome: 'conflict',
                invitation: prev,
                portalAccess: null,
                oneTimeToken: null,
                oneTimeInviteUrl: null,
                revokedPreviousInvitationId: null,
                emailDeliveryPendingBackend: true,
                message:
                    prev.status === 'accepted'
                        ? 'La invitación anterior ya fue aceptada por la clienta; no es posible reemitirla.'
                        : 'La invitación anterior está siendo procesada en este momento.',
                environment: 'production',
                errorCode: 'CONFLICT_STATUS',
            };
        }

        let revokedId: string | null = null;
        if (prev && prev.status === 'pending') {
            const revokeRes = await revokePortalInvitation(previousInvitationId, dto.clientId, options);
            if (!revokeRes.ok) {
                return {
                    ok: false,
                    outcome:
                        revokeRes.outcome === 'already_finalized' ? 'conflict' : revokeRes.outcome,
                    invitation: revokeRes.invitation,
                    portalAccess: null,
                    oneTimeToken: null,
                    oneTimeInviteUrl: null,
                    revokedPreviousInvitationId: null,
                    emailDeliveryPendingBackend: true,
                    message: revokeRes.message,
                    environment: revokeRes.environment,
                    errorCode: revokeRes.errorCode,
                };
            }
            revokedId = previousInvitationId;
        }

        const issued = await issuePortalInvitation(dto, options);
        return {
            ...issued,
            outcome: issued.ok ? 'reissued' : issued.outcome,
            revokedPreviousInvitationId: revokedId,
        };
    } catch (err: any) {
        _lastPostgrestError = `[Network/Client Error]: ${err?.message || String(err)}`;
        _postgrestDemoMode = true;
        return {
            ok: false,
            outcome: 'backend_unavailable',
            invitation: null,
            portalAccess: null,
            oneTimeToken: null,
            oneTimeInviteUrl: null,
            revokedPreviousInvitationId: null,
            emailDeliveryPendingBackend: true,
            message:
                'MODO DEMO (Backend M09-A no disponible): no es posible reemitir invitaciones reales sin backend autorizado.',
            environment: 'demo_unavailable',
            errorCode: 'BACKEND_UNAVAILABLE',
        };
    }
}

/**
 * @deprecated Preferir issuePortalInvitation() que expone el contrato completo M09-B.5.
 */
export async function generatePortalInvitation(
    dto: CreatePortalInvitationDTO,
    options?: PortalPostgrestOptions
): Promise<{ invitation: ClientPortalInvitation | null; rawToken?: string; isDemo: boolean }> {
    const db = options?.dbClient || supabase;
    let actorId = '';
    try {
        const { data } = await db.auth.getUser();
        actorId = data?.user?.id || '';
    } catch {
        actorId = '';
    }
    const res = await issuePortalInvitation(
        {
            clientId: dto.clientId,
            clientEmail: dto.email,
            invitedBy: actorId,
            expiresInHours: dto.expiresInHours,
        },
        options
    );
    return {
        invitation: res.invitation,
        rawToken: res.oneTimeToken || undefined,
        isDemo: res.environment !== 'production',
    };
}

/**
 * Obtiene las filas normalizadas de permisos desde public.client_portal_permissions (M09-A v2.10).
 * Única fuente de verdad. Ante errores RLS (42501) o integridad propaga error sin activar DEMO.
 */
export async function fetchPortalPermissions(
    portalAccessId: string,
    options?: PortalPostgrestOptions
): Promise<ClientPortalPermission[]> {
    const db = options?.dbClient || supabase;
    try {
        const { data, error } = await db
            .from('client_portal_permissions')
            .select('*')
            .eq('portal_access_id', portalAccessId);

        if (!error) {
            _lastPostgrestError = null;
            _postgrestDemoMode = false;
            const rows = (data || []) as ClientPortalPermission[];
            inMemoryPermissionsMap.set(portalAccessId, rows);
            return rows;
        }

        if (isRlsUnauthorizedError(error) || isPostgrestIntegrityOrDomainError(error)) {
            const rlsErr = new Error(error.message || 'Permiso denegado o error consultando permisos.');
            (rlsErr as any).code = error.code || '42501';
            throw rlsErr;
        }

        _lastPostgrestError = `[Supabase ${error.code || 'ERR'}]: ${error.message}`;
        _postgrestDemoMode = true;
    } catch (err: any) {
        if (err && (isRlsUnauthorizedError(err) || isPostgrestIntegrityOrDomainError(err))) {
            throw err;
        }
        _lastPostgrestError = `[Network/Client Error]: ${err?.message || String(err)}`;
        _postgrestDemoMode = true;
    }

    return inMemoryPermissionsMap.get(portalAccessId) || [];
}

function enqueuePortalPermissionWrite<T>(lockKey: string, task: () => Promise<T>): Promise<T> {
    const prev = permissionWriteQueue.get(lockKey) || Promise.resolve();
    const next = prev.then(task, task);
    permissionWriteQueue.set(lockKey, next);
    return next.finally(() => {
        if (permissionWriteQueue.get(lockKey) === next) {
            permissionWriteQueue.delete(lockKey);
        }
    });
}

function buildPermissionErrorResult(params: {
    outcome: PortalPermissionMutationResult['outcome'];
    message: string;
    currentList: ClientPortalPermission[];
    errorCode?: string | null;
    environment?: PortalPermissionMutationResult['environment'];
}): PortalPermissionMutationResult {
    return {
        ok: false,
        outcome: params.outcome,
        permission: null,
        permissions: params.currentList,
        message: params.message,
        environment: params.environment || 'production',
        errorCode: params.errorCode || null,
    };
}

/**
 * Crea, actualiza o revoca un permiso normalizado en public.client_portal_permissions.
 * Compatible con el índice único expresional COALESCE(creation_id, '00000000-...')
 * (sin .upsert() con onConflict), maneja carreras 23505 y respeta Zero Trust:
 * - Prohibido conceder creations:view (u otros recursos exclusivos de prenda) con creation_id = NULL.
 * - Errores 42501/23514/23503 jamás activan DEMO ni simulan persistencia.
 */
export async function setPortalPermission(
    dto: SetPortalPermissionDTO,
    options?: PortalPostgrestOptions
): Promise<PortalPermissionMutationResult> {
    const cachedList = inMemoryPermissionsMap.get(dto.portalAccessId) || [];

    if (!isValidPortalResource(dto.resource) || !isValidPortalAction(dto.action)) {
        return buildPermissionErrorResult({
            outcome: 'invalid_resource_or_action',
            message: 'Recurso o acción fuera del dominio canónico permitido por M09-A v2.10.',
            currentList: cachedList,
            errorCode: 'INVALID_RESOURCE_OR_ACTION',
        });
    }

    if (!isValidActorUuid(dto.grantedBy)) {
        return buildPermissionErrorResult({
            outcome: 'unauthorized_actor',
            message: 'Se requiere una sesión autenticada con UUID válido (granted_by) para modificar permisos.',
            currentList: cachedList,
            errorCode: 'UNAUTHORIZED_ACTOR',
        });
    }

    if (dto.creationId === null && dto.isGranted) {
        if (dto.resource === 'creations' && dto.action === 'view') {
            return buildPermissionErrorResult({
                outcome: 'forbidden_global_creations_view',
                message:
                    'Bloqueo Zero Trust: está prohibido conceder creations:view global (creation_id = NULL); autoriza cada creación explícitamente.',
                currentList: cachedList,
                errorCode: 'GLOBAL_CREATIONS_VIEW_FORBIDDEN',
            });
        }
        if (dto.action === 'view' && CREATION_SCOPED_ONLY_VIEW_RESOURCES.has(dto.resource)) {
            return buildPermissionErrorResult({
                outcome: 'forbidden_global_creation_resource',
                message: `Bloqueo Zero Trust: ${dto.resource}:view debe autorizarse por creación específica, no globalmente.`,
                currentList: cachedList,
                errorCode: 'GLOBAL_CREATION_RESOURCE_FORBIDDEN',
            });
        }
    }

    const lockKey = `${dto.portalAccessId}:${dto.creationId || 'GLOBAL'}:${dto.resource}:${dto.action}`;

    return enqueuePortalPermissionWrite(lockKey, async () => {
        const db = options?.dbClient || supabase;
        const actorId = dto.grantedBy.trim();
        const now = new Date().toISOString();

        const findCurrentRow = async () => {
            let query = db
                .from('client_portal_permissions')
                .select('*')
                .eq('portal_access_id', dto.portalAccessId)
                .eq('resource', dto.resource)
                .eq('action', dto.action);
            query =
                dto.creationId === null
                    ? query.is('creation_id', null)
                    : query.eq('creation_id', dto.creationId);
            return query.maybeSingle();
        };

        const mapDbError = (err: any): PortalPermissionMutationResult => {
            if (isRlsUnauthorizedError(err)) {
                return buildPermissionErrorResult({
                    outcome: 'unauthorized_actor',
                    message: 'Permiso denegado por RLS en client_portal_permissions (se requiere rol admin/designer).',
                    currentList: inMemoryPermissionsMap.get(dto.portalAccessId) || [],
                    errorCode: String(err?.code || '42501'),
                });
            }
            if (isPostgrestIntegrityOrDomainError(err)) {
                return buildPermissionErrorResult({
                    outcome: 'integrity_violation',
                    message: `Violación de integridad referencial o dominio M09-A (${err?.code || '23514'}): ${err?.message || ''}`,
                    currentList: inMemoryPermissionsMap.get(dto.portalAccessId) || [],
                    errorCode: String(err?.code || '23514'),
                });
            }
            if (isPostgrestBackendUnavailableError(err)) {
                _lastPostgrestError = `[Supabase ${err?.code || 'ERR'}]: ${err?.message || 'Tabla no disponible'}`;
                _postgrestDemoMode = true;
                return buildPermissionErrorResult({
                    outcome: 'backend_unavailable',
                    message:
                        'MODO DEMO (Backend M09-A no disponible): no se simuló persistencia sobre public.client_portal_permissions.',
                    currentList: inMemoryPermissionsMap.get(dto.portalAccessId) || [],
                    errorCode: String(err?.code || 'BACKEND_UNAVAILABLE'),
                    environment: 'demo_unavailable',
                });
            }
            return buildPermissionErrorResult({
                outcome: 'error',
                message: `No fue posible actualizar el permiso: ${err?.message || 'Error desconocido'}`,
                currentList: inMemoryPermissionsMap.get(dto.portalAccessId) || [],
                errorCode: String(err?.code || 'ERR'),
            });
        };

        try {
            const { data: existingData, error: findErr } = await findCurrentRow();
            if (findErr) {
                return mapDbError(findErr);
            }

            let existingRow = (existingData as ClientPortalPermission | null) || null;
            let globalIsGranted = false;

            if (!dto.isGranted && dto.creationId !== null) {
                const { data: globalRow, error: globalErr } = await db
                    .from('client_portal_permissions')
                    .select('*')
                    .eq('portal_access_id', dto.portalAccessId)
                    .eq('resource', dto.resource)
                    .eq('action', dto.action)
                    .is('creation_id', null)
                    .maybeSingle();

                if (globalErr) {
                    return mapDbError(globalErr);
                }
                globalIsGranted = Boolean((globalRow as ClientPortalPermission | null)?.is_granted);
            }

            // Revocación limpia: si es por creación y el global no es TRUE, eliminar fila evita bloquear trg_protect_creation_client_reassignment
            if (!dto.isGranted && (dto.creationId === null || !globalIsGranted)) {
                if (!existingRow) {
                    const refreshed = await fetchPortalPermissions(dto.portalAccessId, options);
                    return {
                        ok: true,
                        outcome: 'deleted',
                        permission: null,
                        permissions: refreshed,
                        message: 'Permiso revocado.',
                        environment: 'production',
                    };
                }

                const { error: deleteErr } = await db
                    .from('client_portal_permissions')
                    .delete()
                    .eq('id', existingRow.id);

                if (deleteErr) {
                    return mapDbError(deleteErr);
                }

                _lastPostgrestError = null;
                _postgrestDemoMode = false;
                const refreshed = await fetchPortalPermissions(dto.portalAccessId, options);
                return {
                    ok: true,
                    outcome: 'deleted',
                    permission: null,
                    permissions: refreshed,
                    message: 'Permiso revocado correctamente.',
                    environment: 'production',
                };
            }

            const updateById = async (rowId: string): Promise<PortalPermissionMutationResult> => {
                const { data: updatedData, error: updErr } = await db
                    .from('client_portal_permissions')
                    .update({
                        is_granted: dto.isGranted,
                        granted_by: actorId,
                        updated_at: now,
                    })
                    .eq('id', rowId)
                    .select()
                    .single();

                if (updErr || !updatedData) {
                    return mapDbError(updErr || { code: 'ERR', message: 'No se pudo actualizar fila' });
                }

                _lastPostgrestError = null;
                _postgrestDemoMode = false;
                const refreshed = await fetchPortalPermissions(dto.portalAccessId, options);
                return {
                    ok: true,
                    outcome: 'updated',
                    permission: updatedData as ClientPortalPermission,
                    permissions: refreshed,
                    message: 'Permiso actualizado correctamente.',
                    environment: 'production',
                };
            };

            if (existingRow) {
                return updateById(existingRow.id);
            }

            const { data: insertedData, error: insErr } = await db
                .from('client_portal_permissions')
                .insert({
                    portal_access_id: dto.portalAccessId,
                    creation_id: dto.creationId,
                    resource: dto.resource,
                    action: dto.action,
                    is_granted: dto.isGranted,
                    granted_by: actorId,
                    granted_at: now,
                    updated_at: now,
                })
                .select()
                .single();

            if (!insErr && insertedData) {
                _lastPostgrestError = null;
                _postgrestDemoMode = false;
                const refreshed = await fetchPortalPermissions(dto.portalAccessId, options);
                return {
                    ok: true,
                    outcome: 'inserted',
                    permission: insertedData as ClientPortalPermission,
                    permissions: refreshed,
                    message: 'Permiso otorgado correctamente.',
                    environment: 'production',
                };
            }

            // Resolución determinística de carrera concurrente sobre índice único expresional uq_portal_permissions_canonical_idx
            if (String(insErr?.code || '') === '23505') {
                const { data: racedData, error: raceFindErr } = await findCurrentRow();
                if (raceFindErr) {
                    return mapDbError(raceFindErr);
                }
                existingRow = (racedData as ClientPortalPermission | null) || null;
                if (existingRow) {
                    return updateById(existingRow.id);
                }
            }

            return mapDbError(insErr);
        } catch (err: any) {
            if (err && (isRlsUnauthorizedError(err) || isPostgrestIntegrityOrDomainError(err))) {
                return buildPermissionErrorResult({
                    outcome: isRlsUnauthorizedError(err) ? 'unauthorized_actor' : 'integrity_violation',
                    message: err.message || 'Error de autorización o integridad.',
                    currentList: inMemoryPermissionsMap.get(dto.portalAccessId) || [],
                    errorCode: err.code || 'ERR',
                });
            }
            _lastPostgrestError = `[Network/Client Error]: ${err?.message || String(err)}`;
            _postgrestDemoMode = true;
            return buildPermissionErrorResult({
                outcome: 'backend_unavailable',
                message:
                    'MODO DEMO (Backend M09-A no disponible): no se simuló persistencia sobre public.client_portal_permissions.',
                currentList: inMemoryPermissionsMap.get(dto.portalAccessId) || [],
                errorCode: 'BACKEND_UNAVAILABLE',
                environment: 'demo_unavailable',
            });
        }
    });
}

async function executeSingleStatementCreationRevoke(params: {
    portalAccessId: string;
    creationId?: string | null;
    grantedBy: string;
    resources: readonly PortalResource[];
    options?: PortalPostgrestOptions;
}): Promise<PortalBatchRevokeResult> {
    const cachedList = inMemoryPermissionsMap.get(params.portalAccessId) || [];

    if (!isValidActorUuid(params.grantedBy)) {
        return {
            ok: false,
            outcome: 'unauthorized_actor',
            revokedCount: 0,
            permissions: cachedList,
            singleStatementOnPermissionsTable: false,
            crossTableAuditTransactionPendingBackend: true,
            message: 'Se requiere una sesión autenticada con UUID válido para revocar permisos.',
            environment: 'production',
            errorCode: 'UNAUTHORIZED_ACTOR',
        };
    }

    if (
        params.resources.length === 0 ||
        params.resources.some((r) => !isValidPortalResource(r))
    ) {
        return {
            ok: false,
            outcome: 'integrity_violation',
            revokedCount: 0,
            permissions: cachedList,
            singleStatementOnPermissionsTable: false,
            crossTableAuditTransactionPendingBackend: true,
            message: 'Lista de recursos inválida al intentar revocar permisos.',
            environment: 'production',
            errorCode: 'INVALID_RESOURCE_LIST',
        };
    }

    const db = params.options?.dbClient || supabase;
    try {
        let query = db
            .from('client_portal_permissions')
            .delete()
            .eq('portal_access_id', params.portalAccessId)
            .in('resource', params.resources)
            .eq('is_granted', true);

        query = params.creationId
            ? query.eq('creation_id', params.creationId)
            : query.not('creation_id', 'is', null);

        const { data, error } = await query.select();

        if (error) {
            if (isRlsUnauthorizedError(error)) {
                return {
                    ok: false,
                    outcome: 'unauthorized_actor',
                    revokedCount: 0,
                    permissions: inMemoryPermissionsMap.get(params.portalAccessId) || [],
                    singleStatementOnPermissionsTable: false,
                    crossTableAuditTransactionPendingBackend: true,
                    message: 'Permiso denegado por RLS al revocar permisos del portal.',
                    environment: 'production',
                    errorCode: String(error.code || '42501'),
                };
            }
            if (isPostgrestIntegrityOrDomainError(error)) {
                return {
                    ok: false,
                    outcome: 'integrity_violation',
                    revokedCount: 0,
                    permissions: inMemoryPermissionsMap.get(params.portalAccessId) || [],
                    singleStatementOnPermissionsTable: false,
                    crossTableAuditTransactionPendingBackend: true,
                    message: `Error de integridad al revocar permisos: ${error.message}`,
                    environment: 'production',
                    errorCode: String(error.code || '23514'),
                };
            }
            _lastPostgrestError = `[Supabase ${error.code || 'ERR'}]: ${error.message}`;
            _postgrestDemoMode = true;
            return {
                ok: false,
                outcome: 'backend_unavailable',
                revokedCount: 0,
                permissions: inMemoryPermissionsMap.get(params.portalAccessId) || [],
                singleStatementOnPermissionsTable: false,
                crossTableAuditTransactionPendingBackend: true,
                message: 'MODO DEMO (Backend M09-A no disponible): no se simuló revocación en BD.',
                environment: 'demo_unavailable',
                errorCode: String(error.code || 'BACKEND_UNAVAILABLE'),
            };
        }

        _lastPostgrestError = null;
        _postgrestDemoMode = false;
        const refreshed = await fetchPortalPermissions(params.portalAccessId, params.options);
        const deletedRows = Array.isArray(data) ? data.length : 0;

        return {
            ok: true,
            outcome: 'revoked',
            revokedCount: deletedRows,
            permissions: refreshed,
            singleStatementOnPermissionsTable: true,
            crossTableAuditTransactionPendingBackend: true,
            message:
                'Permisos por creación revocados en una sola operación sobre client_portal_permissions.',
            environment: 'production',
        };
    } catch (err: any) {
        if (err && (isRlsUnauthorizedError(err) || isPostgrestIntegrityOrDomainError(err))) {
            return {
                ok: false,
                outcome: isRlsUnauthorizedError(err) ? 'unauthorized_actor' : 'integrity_violation',
                revokedCount: 0,
                permissions: inMemoryPermissionsMap.get(params.portalAccessId) || [],
                singleStatementOnPermissionsTable: false,
                crossTableAuditTransactionPendingBackend: true,
                message: err.message || 'Error revocando permisos.',
                environment: 'production',
                errorCode: err.code || 'ERR',
            };
        }
        _lastPostgrestError = `[Network/Client Error]: ${err?.message || String(err)}`;
        _postgrestDemoMode = true;
        return {
            ok: false,
            outcome: 'backend_unavailable',
            revokedCount: 0,
            permissions: inMemoryPermissionsMap.get(params.portalAccessId) || [],
            singleStatementOnPermissionsTable: false,
            crossTableAuditTransactionPendingBackend: true,
            message: 'MODO DEMO (Backend M09-A no disponible): no se simuló revocación en BD.',
            environment: 'demo_unavailable',
            errorCode: 'BACKEND_UNAVAILABLE',
        };
    }
}

/**
 * Revoca en una sola sentencia DELETE filtrada sobre public.client_portal_permissions los permisos
 * concedidos a una creación específica (evita exposición parcial entre prenda visible y sub-recursos).
 */
export async function revokeCreationPortalPermissions(
    params: {
        portalAccessId: string;
        creationId: string;
        grantedBy: string;
        resources?: readonly PortalResource[];
    },
    options?: PortalPostgrestOptions
): Promise<PortalBatchRevokeResult> {
    return executeSingleStatementCreationRevoke({
        portalAccessId: params.portalAccessId,
        creationId: params.creationId,
        grantedBy: params.grantedBy,
        resources: params.resources || ['creations', 'sketches', 'fabrics', 'fittings'],
        options,
    });
}

/**
 * Revoca en una sola sentencia DELETE filtrada sobre public.client_portal_permissions todos los permisos
 * con creation_id IS NOT NULL para los recursos indicados al apagar la compuerta maestra Nivel 1.
 */
export async function revokeAllCreationScopedPermissions(
    params: {
        portalAccessId: string;
        grantedBy: string;
        resources?: readonly PortalResource[];
    },
    options?: PortalPostgrestOptions
): Promise<PortalBatchRevokeResult> {
    return executeSingleStatementCreationRevoke({
        portalAccessId: params.portalAccessId,
        creationId: null,
        grantedBy: params.grantedBy,
        resources: params.resources || ['creations', 'sketches', 'fabrics', 'fittings'],
        options,
    });
}

/**
 * Obtiene el registro inmutable de actividad del portal (public.client_portal_activity_log).
 */
export async function fetchPortalActivityLog(
    clientId: string,
    limit: number = 20,
    options?: PortalPostgrestOptions
): Promise<ClientPortalActivityLog[]> {
    const db = options?.dbClient || supabase;
    try {
        const { data, error } = await db
            .from('client_portal_activity_log')
            .select('*')
            .eq('client_id', clientId)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (!error && data) {
            _lastPostgrestError = null;
            _postgrestDemoMode = false;
            return data as ClientPortalActivityLog[];
        }
        if (error) {
            if (isRlsUnauthorizedError(error) || isPostgrestIntegrityOrDomainError(error)) {
                throw error;
            }
            _lastPostgrestError = `[Supabase ${error.code || 'ERR'}]: ${error.message}`;
            _postgrestDemoMode = true;
        }
    } catch (err: any) {
        if (err && (isRlsUnauthorizedError(err) || isPostgrestIntegrityOrDomainError(err))) {
            throw err;
        }
        _lastPostgrestError = `[Network/Client Error]: ${err?.message || String(err)}`;
        _postgrestDemoMode = true;
    }

    const cached = inMemoryActivityLogsMap.get(clientId) || [];
    return cached.slice(0, limit);
}

/**
 * Alias de compatibilidad hacia fetchPortalActivityLog (M09-A v2.10).
 */
export const fetchPortalAuditLog = fetchPortalActivityLog;

/**
 * Obtiene el resumen de estado del portal de una clienta para el Centro de Control.
 */
export async function fetchClientPortalSummary(
    clientId: string,
    options?: PortalPostgrestOptions
): Promise<ClientPortalSummary> {
    const access = await fetchClientPortalAccess(clientId, options);
    const invitations = await fetchClientPortalInvitations(clientId, options);
    const latestInvitation = invitations.length > 0 ? invitations[0] : null;

    let permissions: ClientPortalPermission[] = [];
    if (access) {
        permissions = await fetchPortalPermissions(access.id, options);
    }

    const projection = buildPortalPermissionsProjection({
        access,
        permissions,
        requireActiveAccess: false,
    });
    const activityLogs = await fetchPortalActivityLog(clientId, 100, options);

    return {
        access,
        latestInvitation,
        activeCreationsCount: Object.keys(projection.byCreationId).length,
        visibleCreationsCount: projection.creationModules.visibleCreationIds.length,
        auditEventsCount: activityLogs.length,
    };
}

export interface ClientPortalContext {
    access: ClientPortalAccess | null;
    clientId: string | null;
    permissions: ClientPortalPermission[];
    projection: PortalPermissionsProjection;
    isDemoMode: boolean;
    supabaseError: string | null;
    authError?: boolean;
    errorCode?: string | null;
}

/**
 * Consulta el contexto de acceso y permisos normalizados del portal para la clienta autenticada.
 * Principio Zero Trust:
 * - Solo consulta client_portal_permissions si access.status === 'active'.
 * - Aislamiento estricto por authUserId / email en DEMO (jamás hereda registros de otra clienta).
 * - Nunca activa MODO DEMO ante errores RLS (42501) o integridad.
 */
export async function fetchMyPortalContext(
    authUserId?: string | null,
    userEmail?: string | null,
    options?: PortalPostgrestOptions
): Promise<ClientPortalContext> {
    const db = options?.dbClient || supabase;
    let access: ClientPortalAccess | null = null;
    let clientId: string | null = null;
    let authError = false;
    let errorCode: string | null = null;

    if (authUserId) {
        try {
            const { data, error } = await db
                .from('client_portal_access')
                .select('*')
                .eq('auth_user_id', authUserId)
                .maybeSingle();

            if (!error) {
                _lastPostgrestError = null;
                _postgrestDemoMode = false;
                if (data) {
                    access = data as ClientPortalAccess;
                    clientId = access.client_id;
                }
            } else if (isRlsUnauthorizedError(error) || isPostgrestIntegrityOrDomainError(error)) {
                _lastPostgrestError = `[Supabase ${error.code || 'ERR'}]: ${error.message}`;
                _postgrestDemoMode = false;
                authError = true;
                errorCode = String(error.code || '42501');
                access = null;
                clientId = null;
            } else {
                _lastPostgrestError = `[Supabase ${error.code || 'ERR'}]: ${error.message}`;
                _postgrestDemoMode = true;
            }
        } catch (err: any) {
            if (
                err &&
                (err.code === '42501' ||
                    isRlsUnauthorizedError(err) ||
                    isPostgrestIntegrityOrDomainError(err))
            ) {
                _lastPostgrestError = `[Supabase ${err.code || '42501'}]: ${err?.message || String(err)}`;
                _postgrestDemoMode = false;
                authError = true;
                errorCode = String(err.code || '42501');
                access = null;
                clientId = null;
            } else {
                _lastPostgrestError = `[Network/Client Error]: ${err?.message || String(err)}`;
                _postgrestDemoMode = true;
            }
        }
    }

    // Modo DEMO aislado exclusivamente por identidad del usuario actual (cero cruce entre clientas)
    if (!access && !authError && _postgrestDemoMode) {
        const normalizedEmail = typeof userEmail === 'string' ? userEmail.trim().toLowerCase() : '';
        const identitySeed = authUserId ? `auth:${authUserId}` : normalizedEmail ? `email:${normalizedEmail}` : '';

        if (identitySeed) {
            const existingByAuth = authUserId
                ? Array.from(inMemoryAccessMap.values()).find((entry) => entry.auth_user_id === authUserId)
                : undefined;

            if (existingByAuth) {
                access = existingByAuth;
                clientId = existingByAuth.client_id;
            } else {
                const hash = Math.abs(
                    identitySeed.split('').reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)
                ).toString(16);
                const scopedDemoClientId = `demo-client-${hash}`;
                access =
                    inMemoryAccessMap.get(scopedDemoClientId) ||
                    createDefaultZeroTrustAccess(scopedDemoClientId);
                clientId = scopedDemoClientId;
                inMemoryAccessMap.set(scopedDemoClientId, access);
            }
        }
    }

    let permissions: ClientPortalPermission[] = [];
    if (!authError && access && access.status === 'active') {
        try {
            permissions = await fetchPortalPermissions(access.id, options);
        } catch (permErr: any) {
            permissions = [];
            if (
                permErr &&
                (isRlsUnauthorizedError(permErr) || isPostgrestIntegrityOrDomainError(permErr))
            ) {
                _postgrestDemoMode = false;
                _lastPostgrestError = `[Supabase ${permErr.code || '42501'}]: ${permErr?.message || String(permErr)}`;
                authError = true;
                errorCode = String(permErr.code || '42501');
            }
        }
    }

    const projection = buildPortalPermissionsProjection({
        access: authError ? null : access,
        permissions,
        requireActiveAccess: true,
    });

    return {
        access,
        clientId,
        permissions,
        projection,
        isDemoMode: _postgrestDemoMode,
        supabaseError: _lastPostgrestError,
        authError,
        errorCode,
    };
}

// ==============================================================================
// MOTOR M09-B.4: VERIFICACIÓN Y ACEPTACIÓN SEGURA DE INVITACIONES (/portal/invite)
// ==============================================================================
// Cumple estrictamente M09-A v2.10:
// - Cero aceptación simulada en MODO DEMO ni mutaciones falsas en memoria.
// - Protección previa contra cuentas privilegiadas (admin/designer/superadmin).
// - Aislamiento multi-tenant por correo electrónico y terna idempotente de Saga.
// - Nunca registra tokens en consola ni en almacenamiento persistente local.
// ==============================================================================

export const PORTAL_INVITE_EDGE_FUNCTION = 'accept-portal-invitation';

export type PortalEdgeInvokeFn = (
    functionName: string,
    options: { body: Record<string, unknown>; headers?: Record<string, string> }
) => Promise<{ data: any; error: any }>;

export interface PortalInviteServiceOptions {
    invokeFn?: PortalEdgeInvokeFn;
    accessToken?: string | null;
}

const TOKEN_CHARSET_REGEX = /^[A-Za-z0-9_-]+$/;
const UUID_RFC4122_REGEX =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PRIVILEGED_PORTAL_ROLES = new Set(['admin', 'designer', 'superadmin']);

const inFlightInviteAcceptances = new Map<string, Promise<PortalInvitationAcceptResult>>();

/**
 * Valida la estructura sintáctica del token antes de invocar la red (fail-closed).
 */
export function validateInvitationTokenFormat(rawToken?: string | null): {
    isValid: boolean;
    normalizedToken: string;
    reason: 'empty' | 'invalid_length' | 'invalid_chars' | 'ok';
} {
    const normalized = typeof rawToken === 'string' ? rawToken.trim() : '';
    if (!normalized) {
        return { isValid: false, normalizedToken: '', reason: 'empty' };
    }
    if (/\s/.test(normalized) || !TOKEN_CHARSET_REGEX.test(normalized)) {
        return { isValid: false, normalizedToken: normalized, reason: 'invalid_chars' };
    }
    if (normalized.length < 32 || normalized.length > 128) {
        return { isValid: false, normalizedToken: normalized, reason: 'invalid_length' };
    }
    return { isValid: true, normalizedToken: normalized, reason: 'ok' };
}

/**
 * Valida que el identificador de operación Saga cumpla el formato RFC 4122 UUID.
 */
export function isValidOperationUuid(value?: string | null): boolean {
    return typeof value === 'string' && UUID_RFC4122_REGEX.test(value.trim());
}

/**
 * Genera un UUID v4 RFC 4122 para trazabilidad e idempotencia de Saga.
 */
export function generateSagaOperationId(): string {
    const gCrypto = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
    if (gCrypto && typeof gCrypto.randomUUID === 'function') {
        return gCrypto.randomUUID();
    }
    if (gCrypto && typeof gCrypto.getRandomValues === 'function') {
        const bytes = new Uint8Array(16);
        gCrypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
        return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
    }
    // Fallback con estructura estricta UUID v4 si crypto global no está disponible en entorno JS antiguo
    return 'xxxxxxxx-xxxx-4xxx-8xxx-xxxxxxxxxxxx'.replace(/[x]/g, () =>
        Math.floor(Math.random() * 16).toString(16)
    );
}

/**
 * Enmascara parcialmente un correo electrónico para mostrar contexto seguro sin exponerlo completo.
 */
export function maskEmailForDisplay(email?: string | null): string | null {
    if (typeof email !== 'string') return null;
    const trimmed = email.trim();
    const atIndex = trimmed.indexOf('@');
    if (atIndex <= 0) return null;
    const local = trimmed.slice(0, atIndex);
    const domain = trimmed.slice(atIndex + 1);
    if (!domain) return null;
    if (local.length === 1) return `*@${domain}`;
    if (local.length === 2) return `${local[0]}*@${domain}`;
    const hiddenLen = Math.min(Math.max(local.length - 2, 2), 6);
    return `${local[0]}${'*'.repeat(hiddenLen)}${local[local.length - 1]}@${domain}`;
}

/**
 * Guardia previa de identidad nuclear (Zero Trust):
 * - Impide vincular invitaciones de clientas a cuentas privilegiadas (admin/designer/superadmin).
 * - Impide vinculaciones multi-tenant cuando la sesión autenticada no coincide con la clienta invitada.
 */
export function evaluateInvitationIdentityGuard(params: {
    sessionUser?: { id: string; email?: string | null } | null;
    profileRole?: string | null;
    appMetadataRole?: string | null;
    invitedEmail?: string | null;
}): PortalIdentityGuardResult {
    const normProfileRole =
        typeof params.profileRole === 'string' ? params.profileRole.trim().toLowerCase() : '';
    const normAppRole =
        typeof params.appMetadataRole === 'string'
            ? params.appMetadataRole.trim().toLowerCase()
            : '';

    if (
        PRIVILEGED_PORTAL_ROLES.has(normProfileRole) ||
        PRIVILEGED_PORTAL_ROLES.has(normAppRole)
    ) {
        return {
            allowed: false,
            outcome: 'privileged_role_blocked',
            message:
                'Tu sesión actual pertenece a una cuenta privilegiada del Atelier. Por seguridad nuclear (M09-A), no se vinculan invitaciones de clientas ni se sobrescriben roles existentes.',
        };
    }

    const sessionEmail =
        typeof params.sessionUser?.email === 'string'
            ? params.sessionUser.email.trim().toLowerCase()
            : '';
    const invitedEmail =
        typeof params.invitedEmail === 'string'
            ? params.invitedEmail.trim().toLowerCase()
            : '';

    if (sessionEmail && invitedEmail && sessionEmail !== invitedEmail) {
        return {
            allowed: false,
            outcome: 'email_mismatch',
            message:
                'La sesión autenticada corresponde a un correo distinto al destinatario de esta invitación. Por aislamiento multi-tenant, cierra sesión e ingresa con la cuenta invitada.',
        };
    }

    return {
        allowed: true,
        outcome: 'ok',
        message: 'Identidad compatible con la invitación.',
    };
}

function extractErrorMessageAndCode(body: Record<string, unknown> | null): {
    code: string;
    message: string;
    retryAfterSeconds: number | null;
} {
    const rawCode =
        typeof body?.code === 'string'
            ? body.code
            : typeof body?.claim_status === 'string'
              ? body.claim_status
              : typeof body?.status === 'string'
                ? body.status
                : '';
    const rawMsg =
        typeof body?.error === 'string'
            ? body.error
            : typeof body?.message === 'string'
              ? body.message
              : '';
    const retryRaw = body?.retry_after_seconds;
    const retryAfterSeconds =
        typeof retryRaw === 'number' && Number.isFinite(retryRaw) && retryRaw > 0
            ? retryRaw
            : null;

    return {
        code: rawCode.trim().toLowerCase(),
        message: rawMsg.trim(),
        retryAfterSeconds,
    };
}

function resolveHttpErrorOutcome(
    httpStatus: number,
    body: Record<string, unknown> | null,
    defaultMessage: string
): {
    outcome: PortalInvitationFlowOutcome;
    message: string;
    retryAfterSeconds: number | null;
} {
    const { code, message, retryAfterSeconds } = extractErrorMessageAndCode(body);
    const serverMsg = message || defaultMessage;

    if (httpStatus === 400 || httpStatus === 404) {
        if (code === 'email_mismatch' || /correo|destinatario|mismatch/i.test(serverMsg)) {
            return { outcome: 'email_mismatch', message: serverMsg, retryAfterSeconds: null };
        }
        return {
            outcome: 'invalid',
            message:
                message ||
                'El enlace de invitación no es válido o no existe en los registros del Atelier.',
            retryAfterSeconds: null,
        };
    }

    if (httpStatus === 403) {
        if (code === 'privileged_role' || /privileg|admin|designer|\brol\b/i.test(serverMsg)) {
            return {
                outcome: 'privileged_role_blocked',
                message: serverMsg,
                retryAfterSeconds: null,
            };
        }
        if (
            code === 'identity_mismatch' ||
            code === 'email_mismatch' ||
            /identidad|correo|destinatario/i.test(serverMsg)
        ) {
            return { outcome: 'email_mismatch', message: serverMsg, retryAfterSeconds: null };
        }
        if (code === 'access_inactive' || /no se encuentra en estado activo|suspend|revocad/i.test(serverMsg)) {
            return { outcome: 'revoked', message: serverMsg, retryAfterSeconds: null };
        }
        return { outcome: 'server_error', message: serverMsg, retryAfterSeconds: null };
    }

    if (httpStatus === 409) {
        if (
            code === 'locked' ||
            body?.claim_status === 'locked' ||
            /curso|locked|lease|procesando/i.test(serverMsg)
        ) {
            return {
                outcome: 'processing_locked',
                message:
                    message ||
                    'Esta invitación se encuentra en proceso de activación en este instante. Por favor espera unos segundos antes de reintentar.',
                retryAfterSeconds: retryAfterSeconds ?? 5,
            };
        }
        if (
            code === 'already_accepted_other' ||
            code === 'used' ||
            code === 'reused' ||
            /ya fue aceptada|ya fue utilizada|reutiliz|idempotencia/i.test(serverMsg)
        ) {
            return {
                outcome: 'reused',
                message:
                    message ||
                    'Esta invitación de un solo uso ya fue aceptada y vinculada anteriormente.',
                retryAfterSeconds: null,
            };
        }
        return { outcome: 'server_error', message: serverMsg, retryAfterSeconds: null };
    }

    if (httpStatus === 410) {
        if (code === 'revoked' || body?.status === 'revoked' || /revocad/i.test(serverMsg)) {
            return {
                outcome: 'revoked',
                message:
                    message ||
                    'Esta invitación ha sido revocada por Katherine Carroll. Solicita una nueva invitación al Atelier.',
                retryAfterSeconds: null,
            };
        }
        if (
            code === 'used' ||
            code === 'reused' ||
            body?.status === 'accepted' ||
            /utilizad|aceptad/i.test(serverMsg)
        ) {
            return {
                outcome: 'reused',
                message:
                    message ||
                    'Esta invitación ya fue utilizada anteriormente. Ingresa con tu cuenta habitual.',
                retryAfterSeconds: null,
            };
        }
        if (code === 'failed' || body?.status === 'failed' || /fallid|failed/i.test(serverMsg)) {
            return {
                outcome: 'failed',
                message:
                    message ||
                    'La invitación quedó en estado terminal por una regla de seguridad. Solicita una nueva al Atelier.',
                retryAfterSeconds: null,
            };
        }
        return {
            outcome: 'expired',
            message:
                message ||
                'Este enlace de invitación ha caducado. Comunícate con el Atelier para recibir uno nuevo.',
            retryAfterSeconds: null,
        };
    }

    if (httpStatus === 504) {
        return {
            outcome: 'reconciliation_pending',
            message:
                message ||
                'Tu activación está siendo verificada por nuestro servidor. Se conserva la reserva segura de 15 minutos; puedes reintentar en unos segundos sin riesgo de duplicados.',
            retryAfterSeconds: retryAfterSeconds ?? 5,
        };
    }

    return {
        outcome: 'server_error',
        message: serverMsg,
        retryAfterSeconds: null,
    };
}

/**
 * Traduce respuestas HTTP de verificación de token M09-A v2.10 al contrato del portal.
 */
export function mapInvitationVerifyResponse(
    httpStatus: number,
    body: Record<string, unknown> | null
): PortalInvitationVerifyResult {
    if (httpStatus === 200) {
        const code = typeof body?.code === 'string' ? body.code.toLowerCase() : '';
        const status = typeof body?.status === 'string' ? body.status.toLowerCase() : '';

        if (code === 'already_accepted_self' || status === 'already_accepted_self' || body?.idempotent === true) {
            return {
                outcome: 'already_accepted_self',
                environment: 'production',
                canAccept: false,
                tokenFormatValid: true,
                httpStatus: 200,
                maskedEmail:
                    typeof body?.masked_email === 'string'
                        ? body.masked_email
                        : maskEmailForDisplay(typeof body?.email === 'string' ? body.email : null),
                invitedEmail: typeof body?.email === 'string' ? body.email : null,
                clientDisplayName: typeof body?.client_name === 'string' ? body.client_name : null,
                message:
                    typeof body?.message === 'string' && body.message.trim()
                        ? body.message
                        : 'Tu cuenta ya se encuentra vinculada y activa en el Portal Exclusivo del Atelier.',
            };
        }

        if (body?.valid === true || status === 'valid' || status === 'pending') {
            const rawEmail = typeof body?.email === 'string' ? body.email : null;
            const masked =
                typeof body?.masked_email === 'string' && body.masked_email.trim()
                    ? body.masked_email
                    : maskEmailForDisplay(rawEmail);
            const hint = body?.account_hint;
            const accountHint =
                hint === 'existing_account' || hint === 'new_account' ? hint : 'either';

            return {
                outcome: 'valid',
                environment: 'production',
                canAccept: true,
                tokenFormatValid: true,
                httpStatus: 200,
                maskedEmail: masked,
                invitedEmail: rawEmail,
                clientDisplayName: typeof body?.client_name === 'string' ? body.client_name : null,
                expiresAt: typeof body?.expires_at === 'string' ? body.expires_at : null,
                accountHint,
                message:
                    typeof body?.message === 'string' && body.message.trim()
                        ? body.message
                        : 'Invitación verificada criptográficamente. Lista para activar tu acceso privado.',
            };
        }

        // Fail-closed ante respuesta 200 malformada o ambigua
        return {
            outcome: 'invalid',
            environment: 'production',
            canAccept: false,
            tokenFormatValid: true,
            httpStatus: 200,
            message:
                'La respuesta de verificación no cumple el contrato de seguridad del Atelier.',
        };
    }

    const resolved = resolveHttpErrorOutcome(
        httpStatus,
        body,
        'No fue posible validar la invitación en el servidor.'
    );
    return {
        outcome: resolved.outcome,
        environment: 'production',
        canAccept: false,
        tokenFormatValid: true,
        httpStatus,
        retryAfterSeconds: resolved.retryAfterSeconds,
        message: resolved.message,
    };
}

/**
 * Traduce respuestas HTTP de aceptación idempotente (Saga M09-A v2.10) al contrato del portal.
 */
export function mapInvitationAcceptResponse(
    httpStatus: number,
    body: Record<string, unknown> | null,
    operationId: string
): PortalInvitationAcceptResult {
    if (httpStatus === 200) {
        const status = typeof body?.status === 'string' ? body.status.toLowerCase() : '';
        const code = typeof body?.code === 'string' ? body.code.toLowerCase() : '';
        const isConfirmed =
            body?.success === true &&
            (status === 'accepted' ||
                body?.accepted === true ||
                body?.idempotent === true ||
                code === 'already_accepted_self');

        if (!isConfirmed) {
            return {
                outcome: 'server_error',
                environment: 'production',
                accepted: false,
                idempotentReplay: false,
                operationId,
                httpStatus: 200,
                message:
                    'La confirmación del servidor resultó incompleta (fail-closed). Tu cuenta no se ha vinculado aún; intenta nuevamente.',
            };
        }

        const isReplay = body?.idempotent === true || code === 'already_accepted_self';
        return {
            outcome: isReplay ? 'already_accepted_self' : 'accepted',
            environment: 'production',
            accepted: true,
            idempotentReplay: isReplay,
            operationId,
            httpStatus: 200,
            accessId: typeof body?.access_id === 'string' ? body.access_id : null,
            authUserId: typeof body?.auth_user_id === 'string' ? body.auth_user_id : null,
            requiresSignIn: Boolean(body?.requires_sign_in),
            message: isReplay
                ? 'Esta invitación ya había sido confirmada para tu cuenta. Tu acceso sigue activo sin duplicados.'
                : '¡Bienvenida a tu Portal Exclusivo! Tu acceso privado ha quedado vinculado con seguridad Zero Trust.',
        };
    }

    const resolved = resolveHttpErrorOutcome(
        httpStatus,
        body,
        'No fue posible completar la vinculación de tu portal en este momento.'
    );

    return {
        outcome: resolved.outcome,
        environment: 'production',
        accepted: false,
        idempotentReplay: false,
        operationId,
        httpStatus,
        retryAfterSeconds: resolved.retryAfterSeconds,
        message: resolved.message,
    };
}

async function parseErrorResponseBody(response: any): Promise<Record<string, unknown> | null> {
    if (!response) return null;
    try {
        if (typeof response.clone === 'function') {
            const parsed = await response.clone().json();
            return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
        }
        if (typeof response.json === 'function') {
            const parsed = await response.json();
            return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
        }
    } catch {
        return null;
    }
    return null;
}

async function extractEdgeInvocationResult(
    data: any,
    error: any
): Promise<{
    isBackendUnavailable: boolean;
    httpStatus: number;
    body: Record<string, unknown> | null;
    detail: string | null;
}> {
    if (!error) {
        return {
            isBackendUnavailable: false,
            httpStatus: 200,
            body: data && typeof data === 'object' ? (data as Record<string, unknown>) : null,
            detail: null,
        };
    }

    const errName = typeof error?.name === 'string' ? error.name : '';
    const errMsg = typeof error?.message === 'string' ? error.message : String(error);

    if (
        error instanceof FunctionsRelayError ||
        errName === 'FunctionsRelayError' ||
        error instanceof FunctionsFetchError ||
        errName === 'FunctionsFetchError' ||
        error instanceof TypeError
    ) {
        return {
            isBackendUnavailable: true,
            httpStatus: 503,
            body: null,
            detail: `Edge Function "${PORTAL_INVITE_EDGE_FUNCTION}" no desplegada o inaccesible (${errName || 'Network'}: ${errMsg}).`,
        };
    }

    if (error instanceof FunctionsHttpError || errName === 'FunctionsHttpError' || error?.context) {
        const resp = error?.context;
        const status =
            typeof resp?.status === 'number'
                ? resp.status
                : typeof error?.status === 'number'
                  ? error.status
                  : 500;
        const parsedBody =
            (await parseErrorResponseBody(resp)) ||
            (error?.body && typeof error.body === 'object' ? error.body : null);

        if (status === 404) {
            const bodyCode = typeof parsedBody?.code === 'string' ? parsedBody.code : '';
            const bodyText =
                typeof parsedBody?.message === 'string'
                    ? parsedBody.message
                    : typeof parsedBody?.error === 'string'
                      ? parsedBody.error
                      : '';
            const isGatewayNotFound =
                !parsedBody ||
                bodyCode === 'NOT_FOUND' ||
                /requested function was not found/i.test(bodyText) ||
                /requested function was not found/i.test(errMsg);

            if (isGatewayNotFound) {
                return {
                    isBackendUnavailable: true,
                    httpStatus: 404,
                    body: parsedBody,
                    detail: `Edge Function "${PORTAL_INVITE_EDGE_FUNCTION}" aún no desplegada en el gateway de Supabase (HTTP 404 NOT_FOUND).`,
                };
            }
        }

        const retryHeader =
            typeof resp?.headers?.get === 'function' ? resp.headers.get('Retry-After') : null;
        if (retryHeader && parsedBody && parsedBody.retry_after_seconds === undefined) {
            const parsedRetry = Number.parseInt(retryHeader, 10);
            if (Number.isFinite(parsedRetry) && parsedRetry > 0) {
                parsedBody.retry_after_seconds = parsedRetry;
            }
        }

        return {
            isBackendUnavailable: false,
            httpStatus: status,
            body: parsedBody,
            detail: errMsg || null,
        };
    }

    return {
        isBackendUnavailable: true,
        httpStatus: 503,
        body: null,
        detail: `Transporte de Edge Function no disponible: ${errMsg}`,
    };
}

function buildBackendUnavailableVerifyResult(detail: string | null): PortalInvitationVerifyResult {
    return {
        outcome: 'backend_unavailable',
        environment: 'demo_unavailable',
        canAccept: false,
        tokenFormatValid: true,
        httpStatus: null,
        technicalDetail: detail,
        message:
            'El backend criptográfico de invitaciones (migración M09-A v2.10 y Edge Function accept-portal-invitation) aún no está autorizado ni desplegado en Supabase. Por seguridad Zero Trust, no se simula la validación criptográfica en modo DEMO.',
    };
}

function buildBackendUnavailableAcceptResult(
    operationId: string,
    detail: string | null
): PortalInvitationAcceptResult {
    return {
        outcome: 'backend_unavailable',
        environment: 'demo_unavailable',
        accepted: false,
        idempotentReplay: false,
        operationId,
        httpStatus: null,
        technicalDetail: detail,
        message:
            'No es posible completar la vinculación porque la Edge Function accept-portal-invitation y la migración M09-A v2.10 están pendientes de autorización en Supabase. No se realizaron escrituras remotas ni vinculaciones simuladas.',
    };
}

/**
 * Verifica el estado de un token de invitación contra el backend autorizado (read-only).
 * Fail-closed: ante formato inválido no realiza peticiones de red; ante backend no desplegado
 * informa MODO DEMO / Backend No Disponible sin simular aceptación ni modificar estado remoto.
 */
export async function verifyPortalInvitationToken(
    rawToken?: string | null,
    options?: PortalInviteServiceOptions
): Promise<PortalInvitationVerifyResult> {
    const tokenCheck = validateInvitationTokenFormat(rawToken);
    if (tokenCheck.reason === 'empty') {
        return {
            outcome: 'missing_token',
            environment: 'production',
            canAccept: false,
            tokenFormatValid: false,
            message:
                'Ingresa o abre el enlace completo de tu invitación privada enviada por Katherine Carroll.',
        };
    }

    if (!tokenCheck.isValid) {
        return {
            outcome: 'invalid',
            environment: 'production',
            canAccept: false,
            tokenFormatValid: false,
            message:
                'El formato del código de invitación no es válido. Verifica que copiaste el enlace completo sin espacios ni recortes.',
        };
    }

    const invoke =
        options?.invokeFn ||
        ((fnName: string, invokeOpts: { body: Record<string, unknown>; headers?: Record<string, string> }) =>
            supabase.functions.invoke(fnName, invokeOpts));

    try {
        const headers: Record<string, string> = {};
        if (options?.accessToken) {
            headers.Authorization = `Bearer ${options.accessToken}`;
        }

        const { data, error } = await invoke(PORTAL_INVITE_EDGE_FUNCTION, {
            body: {
                action: 'verify',
                token: tokenCheck.normalizedToken,
            },
            ...(Object.keys(headers).length > 0 ? { headers } : {}),
        });

        const parsed = await extractEdgeInvocationResult(data, error);
        if (parsed.isBackendUnavailable) {
            _lastEdgeError = parsed.detail;
            _edgeFunctionUnavailable = true;
            return buildBackendUnavailableVerifyResult(parsed.detail);
        }

        _lastEdgeError = null;
        _edgeFunctionUnavailable = false;
        return mapInvitationVerifyResponse(parsed.httpStatus, parsed.body);
    } catch (err: any) {
        const detail = err?.message || String(err);
        _lastEdgeError = `[Edge Verify Unavailable]: ${detail}`;
        _edgeFunctionUnavailable = true;
        return buildBackendUnavailableVerifyResult(_lastEdgeError);
    }
}

/**
 * Ejecuta la aceptación idempotente (Saga M09-A v2.10) de una invitación del Portal de Clientas.
 * - Bloquea cuentas privilegiadas y discrepancias multi-tenant antes de tocar la red.
 * - Deduplica clics concurrentes sobre el mismo operationId.
 * - Nunca simula aceptación criptográfica en DEMO ni modifica perfiles o roles localmente.
 */
export async function acceptPortalInvitation(
    dto: AcceptPortalInvitationDTO,
    options?: PortalInviteServiceOptions
): Promise<PortalInvitationAcceptResult> {
    const safeOpId = isValidOperationUuid(dto.operationId) ? dto.operationId.trim() : '';
    const tokenCheck = validateInvitationTokenFormat(dto.token);

    if (!tokenCheck.isValid || !safeOpId) {
        return {
            outcome: 'invalid',
            environment: 'production',
            accepted: false,
            idempotentReplay: false,
            operationId: safeOpId,
            message:
                'El código de invitación o el identificador de operación no cumplen los requisitos de seguridad.',
        };
    }

    // Guardia previa de seguridad nuclear y aislamiento multi-tenant (0 llamadas remotas si falla)
    const guard = evaluateInvitationIdentityGuard({
        sessionUser: dto.sessionUser,
        profileRole: dto.profileRole,
        appMetadataRole: dto.appMetadataRole,
        invitedEmail: dto.expectedInvitedEmail,
    });
    if (guard.outcome !== 'ok') {
        return {
            outcome: guard.outcome,
            environment: 'production',
            accepted: false,
            idempotentReplay: false,
            operationId: safeOpId,
            message: guard.message,
        };
    }

    // Si la clienta no tiene sesión iniciada aún, exigir contraseña fuerte y consentimientos Ley 1581
    if (!dto.sessionUser) {
        if (!dto.password || dto.password.length < 8) {
            return {
                outcome: 'invalid',
                environment: 'production',
                accepted: false,
                idempotentReplay: false,
                operationId: safeOpId,
                message: 'Por tu seguridad, define una contraseña de al menos 8 caracteres.',
            };
        }
        if (
            !dto.consents?.ageConfirmed ||
            !dto.consents?.termsAccepted ||
            !dto.consents?.privacyAccepted
        ) {
            return {
                outcome: 'invalid',
                environment: 'production',
                accepted: false,
                idempotentReplay: false,
                operationId: safeOpId,
                message:
                    'Debes confirmar mayoría de edad, Términos de Uso y Autorización de Datos (Ley 1581 de 2012) para activar tu portal.',
            };
        }
    }

    // Deduplicación idempotente ante doble clic o invocación concurrente con el mismo operationId
    const existingFlight = inFlightInviteAcceptances.get(safeOpId);
    if (existingFlight) {
        return existingFlight;
    }

    const invoke =
        options?.invokeFn ||
        ((fnName: string, invokeOpts: { body: Record<string, unknown>; headers?: Record<string, string> }) =>
            supabase.functions.invoke(fnName, invokeOpts));

    const executionPromise = (async (): Promise<PortalInvitationAcceptResult> => {
        try {
            const headers: Record<string, string> = {};
            if (options?.accessToken) {
                headers.Authorization = `Bearer ${options.accessToken}`;
            }

            const bodyPayload: Record<string, unknown> = {
                action: 'accept',
                token: tokenCheck.normalizedToken,
                operation_id: safeOpId,
            };
            if (!dto.sessionUser && dto.password) {
                bodyPayload.password = dto.password;
            }
            if (dto.consents) {
                bodyPayload.consents = dto.consents;
            }

            const { data, error } = await invoke(PORTAL_INVITE_EDGE_FUNCTION, {
                body: bodyPayload,
                ...(Object.keys(headers).length > 0 ? { headers } : {}),
            });

            const parsed = await extractEdgeInvocationResult(data, error);
            if (parsed.isBackendUnavailable) {
                _lastEdgeError = parsed.detail;
                _edgeFunctionUnavailable = true;
                return buildBackendUnavailableAcceptResult(safeOpId, parsed.detail);
            }

            _lastEdgeError = null;
            _edgeFunctionUnavailable = false;
            return mapInvitationAcceptResponse(parsed.httpStatus, parsed.body, safeOpId);
        } catch (err: any) {
            const detail = err?.message || String(err);
            _lastEdgeError = `[Edge Accept Unavailable]: ${detail}`;
            _edgeFunctionUnavailable = true;
            return buildBackendUnavailableAcceptResult(safeOpId, _lastEdgeError);
        } finally {
            inFlightInviteAcceptances.delete(safeOpId);
        }
    })();

    inFlightInviteAcceptances.set(safeOpId, executionPromise);
    return executionPromise;
}

/**
 * Despacha el correo de invitación vía Edge Function existente `accept-portal-invitation`
 * (acción autenticada `dispatch_email`) inmediatamente después de confirmada la emisión en BD.
 * - Desacoplado: un fallo SMTP o candado apagado jamás invalida ni altera la invitación creada.
 * - Deduplicado por `invitationId` en vuelo y tras confirmación de envío real.
 * - Nunca almacena ni imprime en logs el token original ni el enlace completo.
 */
export async function dispatchPortalInvitationEmailViaEdge(
    dto: DispatchPortalInvitationEmailDTO,
    options?: PortalInviteServiceOptions
): Promise<PortalInvitationEmailDispatchResult> {
    const invitationId = (dto.invitationId || '').trim();
    const tokenCheck = validateInvitationTokenFormat(dto.token);
    const inviteUrl = (dto.inviteUrl || '').trim();

    if (!invitationId || !tokenCheck.isValid || !inviteUrl) {
        return {
            ok: false,
            status: 'failed',
            sent: false,
            simulated: false,
            deduplicated: false,
            invitationPreserved: true,
            messageId: null,
            code: 'invalid_dispatch_payload',
            message:
                'Datos insuficientes para despachar el correo automático; la invitación sigue activa para entrega manual.',
            httpStatus: null,
        };
    }

    if (dispatchedEmailInvitationIds.has(invitationId)) {
        return {
            ok: true,
            status: 'deduplicated',
            sent: false,
            simulated: false,
            deduplicated: true,
            invitationPreserved: true,
            messageId: null,
            code: 'already_dispatched_client',
            message:
                'El correo de esta invitación ya fue despachado previamente (duplicado prevenido).',
            httpStatus: 200,
        };
    }

    const existingFlight = inFlightEmailDispatches.get(invitationId);
    if (existingFlight) {
        return existingFlight;
    }

    const invoke =
        options?.invokeFn ||
        ((fnName: string, invokeOpts: { body: Record<string, unknown>; headers?: Record<string, string> }) =>
            supabase.functions.invoke(fnName, invokeOpts));

    const executionPromise = (async (): Promise<PortalInvitationEmailDispatchResult> => {
        try {
            let accessToken = options?.accessToken?.trim() || '';
            if (!accessToken) {
                try {
                    const { data: sessionData } = await supabase.auth.getSession();
                    accessToken = sessionData?.session?.access_token?.trim() || '';
                } catch {
                    accessToken = '';
                }
            }

            const headers: Record<string, string> = {};
            if (accessToken) {
                headers.Authorization = `Bearer ${accessToken}`;
            }

            const { data, error } = await invoke(PORTAL_INVITE_EDGE_FUNCTION, {
                body: {
                    action: 'dispatch_email',
                    invitation_id: invitationId,
                    token: tokenCheck.normalizedToken,
                    invite_url: inviteUrl,
                    ...(dto.recipientName ? { recipient_name: dto.recipientName.trim() } : {}),
                    ...(dto.customMessage ? { custom_message: dto.customMessage.trim() } : {}),
                    ...(dto.permissionsBullets && dto.permissionsBullets.length > 0
                        ? { permissions_bullets: [...dto.permissionsBullets] }
                        : {}),
                },
                ...(Object.keys(headers).length > 0 ? { headers } : {}),
            });

            const parsed = await extractEdgeInvocationResult(data, error);
            if (parsed.isBackendUnavailable) {
                _lastEdgeError = parsed.detail;
                _edgeFunctionUnavailable = true;
                return {
                    ok: false,
                    status: 'backend_unavailable',
                    sent: false,
                    simulated: false,
                    deduplicated: false,
                    invitationPreserved: true,
                    messageId: null,
                    code: 'backend_unavailable',
                    message:
                        'Servicio Edge de despacho no disponible; la invitación sigue activa y puedes compartir el enlace manualmente.',
                    httpStatus: parsed.httpStatus,
                };
            }

            _lastEdgeError = null;
            _edgeFunctionUnavailable = false;

            const body = (parsed.body && typeof parsed.body === 'object' ? parsed.body : {}) as Record<
                string,
                unknown
            >;
            const code = typeof body.code === 'string' ? body.code : 'smtp_dispatch_error';
            const messageId = typeof body.message_id === 'string' ? body.message_id : null;
            const serverMsg = typeof body.message === 'string' ? body.message : '';

            if (parsed.httpStatus === 200 && body.sent === true) {
                dispatchedEmailInvitationIds.add(invitationId);
                return {
                    ok: true,
                    status: 'sent',
                    sent: true,
                    simulated: false,
                    deduplicated: false,
                    invitationPreserved: true,
                    messageId,
                    code: 'dispatched',
                    message:
                        serverMsg ||
                        'Correo de invitación enviado exitosamente vía servidor SMTP corporativo.',
                    httpStatus: 200,
                };
            }

            if (parsed.httpStatus === 200 && body.simulated === true) {
                return {
                    ok: true,
                    status: 'simulated_disabled',
                    sent: false,
                    simulated: true,
                    deduplicated: false,
                    invitationPreserved: true,
                    messageId: null,
                    code,
                    message:
                        serverMsg ||
                        'Despacho automático en modo preparación (PORTAL_EMAIL_DISPATCH_ENABLED=false). Comparte el enlace único manualmente.',
                    httpStatus: 200,
                };
            }

            if (body.deduplicated === true) {
                if (code === 'already_dispatched') {
                    dispatchedEmailInvitationIds.add(invitationId);
                }
                return {
                    ok: parsed.httpStatus === 200,
                    status: 'deduplicated',
                    sent: false,
                    simulated: false,
                    deduplicated: true,
                    invitationPreserved: true,
                    messageId,
                    code,
                    message:
                        serverMsg ||
                        'El correo para esta invitación ya fue despachado previamente (sin duplicados).',
                    httpStatus: parsed.httpStatus,
                };
            }

            return {
                ok: false,
                status: 'failed',
                sent: false,
                simulated: false,
                deduplicated: false,
                invitationPreserved: true,
                messageId: null,
                code,
                message:
                    serverMsg ||
                    'No fue posible despachar el correo automático; la invitación sigue activa y válida para entrega manual.',
                httpStatus: parsed.httpStatus,
            };
        } catch (err: any) {
            const detail = err?.message || String(err);
            _lastEdgeError = `[Edge Dispatch Email Unavailable]: ${detail}`;
            return {
                ok: false,
                status: 'backend_unavailable',
                sent: false,
                simulated: false,
                deduplicated: false,
                invitationPreserved: true,
                messageId: null,
                code: 'dispatch_transport_error',
                message:
                    'No fue posible contactar el servicio de correo automático; la invitación sigue activa para entrega manual.',
                httpStatus: null,
            };
        } finally {
            inFlightEmailDispatches.delete(invitationId);
        }
    })();

    inFlightEmailDispatches.set(invitationId, executionPromise);
    return executionPromise;
}

// ==============================================================================
// MOTOR M09-B.7: LECTURA SEGURA SOBRE LAS 6 VISTAS CANÓNICAS + TELEMETRÍA
// ==============================================================================
// Reglas estrictas M09-A v2.10:
// - Consultas exclusivamente contra public.v_portal_* (cero tablas base).
// - Cero simulación de datos de clienta o auditoría en MODO DEMO.
// - Errores RLS (42501) o dominio (22023) jamás activan MODO DEMO.
// - Telemetría via public.log_portal_event(p_event_type, p_metadata) con whitelist y <= 2 KB.
// ==============================================================================

const PORTAL_TELEMETRY_METADATA_MAX_BYTES = 1800;

export function isValidPortalTelemetryEvent(value: unknown): value is PortalTelemetryEventType {
    return typeof value === 'string' && (PORTAL_TELEMETRY_EVENTS as readonly string[]).includes(value);
}

function getUtf8ByteLength(text: string): number {
    if (typeof TextEncoder !== 'undefined') {
        return new TextEncoder().encode(text).length;
    }
    return unescape(encodeURIComponent(text)).length;
}

function classifyViewReadError(error: any): {
    status: PortalViewReadStatus;
    activatesDemo: boolean;
    code: string;
    message: string;
} {
    const code = String(error?.code || 'ERR');
    const rawMsg = String(error?.message || 'Error consultando vista del portal.');

    if (isRlsUnauthorizedError(error)) {
        return {
            status: 'unauthorized',
            activatesDemo: false,
            code: code === 'ERR' ? '42501' : code,
            message: rawMsg,
        };
    }

    if (isPostgrestIntegrityOrDomainError(error)) {
        return {
            status: 'error',
            activatesDemo: false,
            code,
            message: rawMsg,
        };
    }

    if (isPostgrestBackendUnavailableError(error)) {
        return {
            status: 'backend_unavailable',
            activatesDemo: true,
            code: code === 'ERR' ? 'PGRST205' : code,
            message: rawMsg,
        };
    }

    return {
        status: 'error',
        activatesDemo: false,
        code,
        message: rawMsg,
    };
}

function buildViewFailureResult<T>(
    emptyValue: T,
    classified: {
        status: PortalViewReadStatus;
        activatesDemo: boolean;
        code: string;
        message: string;
    }
): PortalViewReadResult<T> {
    if (classified.activatesDemo) {
        _lastPostgrestError = `[Supabase ${classified.code}]: ${classified.message}`;
        _postgrestDemoMode = true;
    } else {
        _lastPostgrestError = `[Supabase ${classified.code}]: ${classified.message}`;
        if (classified.status === 'unauthorized') {
            _postgrestDemoMode = false;
        }
    }

    return {
        ok: false,
        status: classified.status,
        data: emptyValue,
        environment: classified.activatesDemo ? 'demo_unavailable' : 'production',
        errorCode: classified.code,
        errorMessage: classified.message,
    };
}

function sanitizeClientProfileView(raw: any): PortalClientProfileView | null {
    if (!raw || typeof raw !== 'object' || !raw.id) return null;
    return {
        id: String(raw.id),
        full_name: String(raw.full_name || ''),
        email: raw.email != null ? String(raw.email) : null,
        phone: raw.phone != null ? String(raw.phone) : null,
        city: raw.city != null ? String(raw.city) : null,
        style_preferences: raw.style_preferences != null ? String(raw.style_preferences) : null,
        photo_url: raw.photo_url != null ? String(raw.photo_url) : null,
        status: String(raw.status || ''),
    };
}

function sanitizeCreationView(raw: any): PortalCreationView {
    return {
        id: String(raw.id),
        name: String(raw.name || ''),
        description: raw.description != null ? String(raw.description) : null,
        creation_type: raw.creation_type != null ? String(raw.creation_type) : null,
        status: String(raw.status || ''),
        occasion: raw.occasion != null ? String(raw.occasion) : null,
        garment_type: raw.garment_type != null ? String(raw.garment_type) : null,
        target_date: raw.target_date != null ? String(raw.target_date) : null,
        created_at: String(raw.created_at || ''),
        can_view_sketches: Boolean(raw.can_view_sketches),
        can_approve_sketches: Boolean(raw.can_approve_sketches),
        can_view_fabrics: Boolean(raw.can_view_fabrics),
        can_view_fittings: Boolean(raw.can_view_fittings),
        can_view_budget: Boolean(raw.can_view_budget),
        can_send_observations: Boolean(raw.can_send_observations),
    };
}

function sanitizeMeasurementSessionView(raw: any): PortalMeasurementSessionView {
    return {
        id: String(raw.id),
        session_date: String(raw.session_date || ''),
        status: String(raw.status || ''),
        unit_system: raw.unit_system != null ? String(raw.unit_system) : null,
        version_number:
            typeof raw.version_number === 'number'
                ? raw.version_number
                : raw.version_number != null && !Number.isNaN(Number(raw.version_number))
                  ? Number(raw.version_number)
                  : null,
    };
}

function sanitizeCommercialQuoteView(raw: any): PortalCommercialQuoteView {
    const rawSchedule = raw.payment_schedule;
    let safeSchedule: Record<string, unknown> | unknown[] | string | null = null;
    if (typeof rawSchedule === 'string') {
        safeSchedule = rawSchedule;
    } else if (Array.isArray(rawSchedule)) {
        safeSchedule = rawSchedule;
    } else if (rawSchedule && typeof rawSchedule === 'object') {
        safeSchedule = rawSchedule as Record<string, unknown>;
    }

    return {
        id: String(raw.id),
        creation_id: raw.creation_id != null ? String(raw.creation_id) : null,
        quote_number: String(raw.quote_number || ''),
        currency: String(raw.currency || 'COP'),
        total_amount: Number(raw.total_amount ?? 0),
        payment_schedule: safeSchedule,
        valid_until: raw.valid_until != null ? String(raw.valid_until) : null,
        status: String(raw.status || ''),
        approved_at: raw.approved_at != null ? String(raw.approved_at) : null,
    };
}

function sanitizeAppointmentView(raw: any): PortalAppointmentView {
    return {
        id: String(raw.id),
        appointment_type: String(raw.appointment_type || ''),
        status: String(raw.status || ''),
        starts_at: String(raw.starts_at || ''),
        ends_at: raw.ends_at != null ? String(raw.ends_at) : null,
        location_space: raw.location_space != null ? String(raw.location_space) : null,
        preparation_notes: raw.preparation_notes != null ? String(raw.preparation_notes) : null,
    };
}

function sanitizeFittingSessionView(raw: any): PortalFittingSessionView {
    const rawRoundType = raw.round_type != null ? String(raw.round_type) : null;
    const rawStatus = String(raw.status || 'scheduled');
    return {
        id: String(raw.id),
        creation_id: String(raw.creation_id || ''),
        session_number: Number(raw.session_number ?? 0),
        round_type: isFittingRoundType(rawRoundType) ? rawRoundType : null,
        title: raw.title != null ? String(raw.title) : null,
        status: isFittingSessionStatus(rawStatus) ? rawStatus : 'scheduled',
        scheduled_at: raw.scheduled_at != null ? String(raw.scheduled_at) : null,
        conducted_at: raw.conducted_at != null ? String(raw.conducted_at) : null,
        location_note: raw.location_note != null ? String(raw.location_note) : null,
    };
}

export async function fetchPortalClientProfile(
    options?: PortalPostgrestOptions
): Promise<PortalViewReadResult<PortalClientProfileView | null>> {
    const db = options?.dbClient || supabase;
    try {
        const { data, error } = await db
            .from(PORTAL_CANONICAL_VIEWS.clientProfile)
            .select('id, full_name, email, phone, city, style_preferences, photo_url, status')
            .maybeSingle();

        if (!error) {
            return {
                ok: true,
                status: 'ok',
                data: sanitizeClientProfileView(data),
                environment: 'production',
            };
        }

        return buildViewFailureResult<PortalClientProfileView | null>(
            null,
            classifyViewReadError(error)
        );
    } catch (err: any) {
        return buildViewFailureResult<PortalClientProfileView | null>(
            null,
            classifyViewReadError(err)
        );
    }
}

export async function fetchPortalCreationsView(
    options?: PortalPostgrestOptions
): Promise<PortalViewReadResult<PortalCreationView[]>> {
    const db = options?.dbClient || supabase;
    try {
        const { data, error } = await db
            .from(PORTAL_CANONICAL_VIEWS.creations)
            .select(
                'id, name, description, creation_type, status, occasion, garment_type, target_date, created_at, can_view_sketches, can_approve_sketches, can_view_fabrics, can_view_fittings, can_view_budget, can_send_observations'
            )
            .order('created_at', { ascending: false });

        if (!error) {
            const rows = Array.isArray(data) ? data.map(sanitizeCreationView) : [];
            return {
                ok: true,
                status: 'ok',
                data: rows,
                environment: 'production',
            };
        }

        return buildViewFailureResult<PortalCreationView[]>([], classifyViewReadError(error));
    } catch (err: any) {
        return buildViewFailureResult<PortalCreationView[]>([], classifyViewReadError(err));
    }
}

export async function fetchPortalMeasurementSessionsView(
    options?: PortalPostgrestOptions
): Promise<PortalViewReadResult<PortalMeasurementSessionView[]>> {
    const db = options?.dbClient || supabase;
    try {
        const { data, error } = await db
            .from(PORTAL_CANONICAL_VIEWS.measurementSessions)
            .select('id, session_date, status, unit_system, version_number')
            .order('session_date', { ascending: false });

        if (!error) {
            const rows = Array.isArray(data) ? data.map(sanitizeMeasurementSessionView) : [];
            return {
                ok: true,
                status: 'ok',
                data: rows,
                environment: 'production',
            };
        }

        return buildViewFailureResult<PortalMeasurementSessionView[]>(
            [],
            classifyViewReadError(error)
        );
    } catch (err: any) {
        return buildViewFailureResult<PortalMeasurementSessionView[]>(
            [],
            classifyViewReadError(err)
        );
    }
}

export async function fetchPortalCommercialQuotesView(
    options?: PortalPostgrestOptions
): Promise<PortalViewReadResult<PortalCommercialQuoteView[]>> {
    const db = options?.dbClient || supabase;
    try {
        const { data, error } = await db
            .from(PORTAL_CANONICAL_VIEWS.commercialQuotes)
            .select(
                'id, creation_id, quote_number, currency, total_amount, payment_schedule, valid_until, status, approved_at'
            )
            .order('approved_at', { ascending: false });

        if (!error) {
            const rows = Array.isArray(data) ? data.map(sanitizeCommercialQuoteView) : [];
            return {
                ok: true,
                status: 'ok',
                data: rows,
                environment: 'production',
            };
        }

        return buildViewFailureResult<PortalCommercialQuoteView[]>(
            [],
            classifyViewReadError(error)
        );
    } catch (err: any) {
        return buildViewFailureResult<PortalCommercialQuoteView[]>(
            [],
            classifyViewReadError(err)
        );
    }
}

export async function fetchPortalAppointmentsView(
    options?: PortalPostgrestOptions
): Promise<PortalViewReadResult<PortalAppointmentView[]>> {
    const db = options?.dbClient || supabase;
    try {
        const { data, error } = await db
            .from(PORTAL_CANONICAL_VIEWS.appointments)
            .select(
                'id, appointment_type, status, starts_at, ends_at, location_space, preparation_notes'
            )
            .order('starts_at', { ascending: true });

        if (!error) {
            const rows = Array.isArray(data) ? data.map(sanitizeAppointmentView) : [];
            return {
                ok: true,
                status: 'ok',
                data: rows,
                environment: 'production',
            };
        }

        return buildViewFailureResult<PortalAppointmentView[]>([], classifyViewReadError(error));
    } catch (err: any) {
        return buildViewFailureResult<PortalAppointmentView[]>([], classifyViewReadError(err));
    }
}

export async function fetchPortalFittingSessionsView(
    options?: PortalPostgrestOptions
): Promise<PortalViewReadResult<PortalFittingSessionView[]>> {
    const db = options?.dbClient || supabase;
    try {
        const { data, error } = await db
            .from(PORTAL_CANONICAL_VIEWS.fittingSessions)
            .select(
                'id, creation_id, session_number, round_type, title, status, scheduled_at, conducted_at, location_note'
            )
            .order('scheduled_at', { ascending: true });

        if (!error) {
            const rows = Array.isArray(data) ? data.map(sanitizeFittingSessionView) : [];
            return {
                ok: true,
                status: 'ok',
                data: rows,
                environment: 'production',
            };
        }

        return buildViewFailureResult<PortalFittingSessionView[]>(
            [],
            classifyViewReadError(error)
        );
    } catch (err: any) {
        return buildViewFailureResult<PortalFittingSessionView[]>(
            [],
            classifyViewReadError(err)
        );
    }
}

function makeEmptyDashboardResult(params: {
    context: ClientPortalContext;
    status: PortalViewReadStatus;
    errorCode?: string | null;
}): ClientPortalDashboardData {
    return {
        access: params.context.access,
        clientId: params.context.clientId,
        permissions: params.context.permissions,
        projection: params.context.projection,
        profile: null,
        creations: [],
        measurementSessions: [],
        commercialQuotes: [],
        appointments: [],
        fittingSessions: [],
        status: params.status,
        isDemoMode: params.context.isDemoMode,
        environment: params.context.isDemoMode ? 'demo_unavailable' : 'production',
        errorCode: params.errorCode ?? params.context.errorCode ?? null,
        supabaseError: params.context.supabaseError,
        viewErrors: {},
    };
}

/**
 * Orquesta de forma segura (Zero Trust) la carga completa del Dashboard de Clienta.
 * - Exige auth_user_id autenticado + status === 'active' antes de tocar ninguna vista.
 * - En MODO DEMO o ante errores RLS (42501), ejecuta 0 consultas a las 6 vistas.
 * - Nunca amplía ni inventa datos fuera de lo retornado por las vistas v_portal_*.
 */
export async function fetchClientPortalDashboardData(
    params: { authUserId?: string | null; userEmail?: string | null },
    options?: PortalPostgrestOptions
): Promise<ClientPortalDashboardData> {
    const context = await fetchMyPortalContext(params.authUserId, params.userEmail, options);

    if (context.authError) {
        return makeEmptyDashboardResult({
            context,
            status: 'unauthorized',
            errorCode: context.errorCode || '42501',
        });
    }

    if (context.isDemoMode) {
        return makeEmptyDashboardResult({
            context,
            status: 'backend_unavailable',
            errorCode: 'PGRST205',
        });
    }

    if (!context.access || context.access.status !== 'active') {
        return makeEmptyDashboardResult({
            context,
            status: 'inactive_access',
            errorCode: null,
        });
    }

    const { access, permissions, projection } = context;

    const shouldReadCreations = projection.creationModules.hasAnyVisibleCreation;
    const shouldReadMeasurements = projection.globalModules.measurementsView;
    const shouldReadQuotes =
        projection.globalModules.quotationsView ||
        permissions.some(
            (p) => p.resource === 'quotations' && p.action === 'view' && p.is_granted
        );
    const shouldReadAppointments = projection.globalModules.appointmentsView;
    const shouldReadFittings = projection.creationModules.hasAnyVisibleFittings;

    const skippedOk = <T>(val: T): PortalViewReadResult<T> => ({
        ok: true,
        status: 'ok',
        data: val,
        environment: 'production',
    });

    const [profileRes, creationsRes, measurementsRes, quotesRes, appointmentsRes, fittingsRes] =
        await Promise.all([
            fetchPortalClientProfile(options),
            shouldReadCreations
                ? fetchPortalCreationsView(options)
                : Promise.resolve(skippedOk<PortalCreationView[]>([])),
            shouldReadMeasurements
                ? fetchPortalMeasurementSessionsView(options)
                : Promise.resolve(skippedOk<PortalMeasurementSessionView[]>([])),
            shouldReadQuotes
                ? fetchPortalCommercialQuotesView(options)
                : Promise.resolve(skippedOk<PortalCommercialQuoteView[]>([])),
            shouldReadAppointments
                ? fetchPortalAppointmentsView(options)
                : Promise.resolve(skippedOk<PortalAppointmentView[]>([])),
            shouldReadFittings
                ? fetchPortalFittingSessionsView(options)
                : Promise.resolve(skippedOk<PortalFittingSessionView[]>([])),
        ]);

    // Defensa en profundidad: intersección estricta contra client_portal_permissions (el frontend jamás amplía)
    const filteredCreations = creationsRes.data
        .filter((row) => projection.byCreationId[row.id]?.canViewCreation === true)
        .map((row) => {
            const p = projection.byCreationId[row.id];
            return {
                ...row,
                can_view_sketches: Boolean(row.can_view_sketches && p.canViewSketches),
                can_approve_sketches: Boolean(row.can_approve_sketches && p.canApproveSketches),
                can_view_fabrics: Boolean(row.can_view_fabrics && p.canViewFabrics),
                can_view_fittings: Boolean(row.can_view_fittings && p.canViewFittings),
                can_view_budget: Boolean(row.can_view_budget && p.canViewQuotations),
                can_send_observations: Boolean(row.can_send_observations && p.canSendObservations),
            };
        });

    const filteredMeasurements = shouldReadMeasurements
        ? measurementsRes.data.filter((s) => s.status === 'completed' || s.status === 'verified')
        : [];

    const filteredQuotes = quotesRes.data.filter((q) =>
        evaluatePortalPermission({
            accessStatus: access.status,
            permissions,
            resource: 'quotations',
            action: 'view',
            creationId: q.creation_id,
            requireActiveAccess: true,
        })
    );

    const filteredAppointments = shouldReadAppointments
        ? appointmentsRes.data.filter((ap) => ap.status !== 'cancelled')
        : [];

    const filteredFittings = fittingsRes.data.filter(
        (fs) =>
            Boolean(projection.byCreationId[fs.creation_id]?.canViewFittings) &&
            evaluatePortalPermission({
                accessStatus: access.status,
                permissions,
                resource: 'fittings',
                action: 'view',
                creationId: fs.creation_id,
                requireActiveAccess: true,
            })
    );

    const viewErrors: Partial<
        Record<PortalCanonicalViewKey, { status: PortalViewReadStatus; code: string | null }>
    > = {};

    const resultsList: {
        key: PortalCanonicalViewKey;
        res: PortalViewReadResult<unknown>;
    }[] = [
        { key: 'clientProfile', res: profileRes },
        { key: 'creations', res: creationsRes },
        { key: 'measurementSessions', res: measurementsRes },
        { key: 'commercialQuotes', res: quotesRes },
        { key: 'appointments', res: appointmentsRes },
        { key: 'fittingSessions', res: fittingsRes },
    ];

    let overallStatus: PortalViewReadStatus = 'ok';
    let firstErrorCode: string | null = null;
    let anyDemoUnavailable = false;
    let anyUnauthorized = false;
    let anyError = false;

    for (const item of resultsList) {
        if (!item.res.ok) {
            viewErrors[item.key] = {
                status: item.res.status,
                code: item.res.errorCode ?? null,
            };
            if (!firstErrorCode && item.res.errorCode) {
                firstErrorCode = item.res.errorCode;
            }
            if (item.res.status === 'unauthorized') anyUnauthorized = true;
            else if (item.res.status === 'backend_unavailable') anyDemoUnavailable = true;
            else anyError = true;
        }
    }

    if (anyUnauthorized) {
        overallStatus = 'unauthorized';
        _postgrestDemoMode = false;
    } else if (anyDemoUnavailable) {
        overallStatus = 'backend_unavailable';
        _postgrestDemoMode = true;
    } else if (anyError) {
        overallStatus = 'error';
    }

    return {
        access,
        clientId: context.clientId,
        permissions,
        projection,
        profile: profileRes.ok ? profileRes.data : null,
        creations: filteredCreations,
        measurementSessions: filteredMeasurements,
        commercialQuotes: filteredQuotes,
        appointments: filteredAppointments,
        fittingSessions: filteredFittings,
        status: overallStatus,
        isDemoMode: anyDemoUnavailable && !anyUnauthorized,
        environment: anyDemoUnavailable && !anyUnauthorized ? 'demo_unavailable' : 'production',
        errorCode: firstErrorCode,
        supabaseError: overallStatus === 'ok' ? null : _lastPostgrestError,
        viewErrors,
    };
}

/**
 * Registra eventos de telemetría autorizados llamando a public.log_portal_event(p_event_type, p_metadata).
 * - Valida localmente la lista blanca exacta de 8 eventos y tamaño <= 1800 B (< 2048 B Postgres).
 * - Jamás bloquea la UI ni simula inserciones de auditoría en MODO DEMO.
 */
export async function logPortalTelemetryEvent(
    eventType: string,
    metadata: Record<string, unknown> = {},
    options?: PortalPostgrestOptions
): Promise<PortalTelemetryLogResult> {
    if (!isValidPortalTelemetryEvent(eventType)) {
        return {
            ok: false,
            outcome: 'invalid_event',
            environment: 'production',
            eventType: String(eventType || ''),
            message: 'Evento de telemetría no autorizado por la lista blanca canónica M09-A v2.10.',
        };
    }

    let safeMetadata: Record<string, unknown> = {};
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
        safeMetadata = metadata;
    }

    let serialized = '{}';
    try {
        serialized = JSON.stringify(safeMetadata);
    } catch {
        return {
            ok: false,
            outcome: 'error',
            environment: 'production',
            eventType,
            message: 'La metadata de telemetría no es serializable en JSON.',
        };
    }

    if (getUtf8ByteLength(serialized) > PORTAL_TELEMETRY_METADATA_MAX_BYTES) {
        return {
            ok: false,
            outcome: 'metadata_too_large',
            environment: 'production',
            eventType,
            errorCode: '22023',
            message: 'La metadata excede el margen seguro de 2 KB impuesto por log_portal_event.',
        };
    }

    if (!options?.dbClient && _postgrestDemoMode) {
        return {
            ok: false,
            outcome: 'backend_unavailable',
            environment: 'demo_unavailable',
            eventType,
            errorCode: 'PGRST205',
            message: 'MODO DEMO: telemetría no simulada en memoria local.',
        };
    }

    const db = options?.dbClient || supabase;
    if (typeof db?.rpc !== 'function') {
        return {
            ok: false,
            outcome: 'backend_unavailable',
            environment: 'demo_unavailable',
            eventType,
            errorCode: '42883',
            message: 'Cliente RPC no disponible para invocar log_portal_event.',
        };
    }

    try {
        const { error } = await db.rpc('log_portal_event', {
            p_event_type: eventType,
            p_metadata: safeMetadata,
        });

        if (!error) {
            return {
                ok: true,
                outcome: 'logged',
                environment: 'production',
                eventType,
                message: 'Evento de telemetría registrado en client_portal_activity_log.',
            };
        }

        const code = String(error?.code || 'ERR').toUpperCase();
        const msg = String(error?.message || 'Error invocando log_portal_event.');

        if (isRlsUnauthorizedError(error)) {
            return {
                ok: false,
                outcome: 'unauthorized_or_inactive',
                environment: 'production',
                eventType,
                errorCode: code === 'ERR' ? '42501' : code,
                message: msg,
            };
        }

        if (code === '22023') {
            return {
                ok: false,
                outcome: 'metadata_too_large',
                environment: 'production',
                eventType,
                errorCode: code,
                message: msg,
            };
        }

        if (isPostgrestBackendUnavailableError(error)) {
            return {
                ok: false,
                outcome: 'backend_unavailable',
                environment: 'demo_unavailable',
                eventType,
                errorCode: code,
                message: msg,
            };
        }

        return {
            ok: false,
            outcome: 'error',
            environment: 'production',
            eventType,
            errorCode: code,
            message: msg,
        };
    } catch (err: any) {
        if (isRlsUnauthorizedError(err)) {
            return {
                ok: false,
                outcome: 'unauthorized_or_inactive',
                environment: 'production',
                eventType,
                errorCode: String(err?.code || '42501'),
                message: err?.message || String(err),
            };
        }
        return {
            ok: false,
            outcome: isPostgrestBackendUnavailableError(err) ? 'backend_unavailable' : 'error',
            environment: isPostgrestBackendUnavailableError(err) ? 'demo_unavailable' : 'production',
            eventType,
            errorCode: err?.code ? String(err.code) : null,
            message: err?.message || String(err),
        };
    }
}
