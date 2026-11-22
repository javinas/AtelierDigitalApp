// ==============================================================================
// ATELIER DIGITAL — STORE VOLÁTIL EN MEMORIA COMPARTIDA: PORTAL M09
// Archivo: src/components/portal/portalLocalMemoryStore.ts
// ==============================================================================
// Fuente única de verdad volátil en memoria RAM compartida exclusivamente
// en entorno local entre:
// - Portal de Gestión de la Diseñadora (src/components/portal/*)
// - Portal Privado de la Clienta (src/components/clientPortal/*)
//
// GARANTÍAS ESTRICTAS:
// - 100 % en memoria RAM (sin localStorage, sin sessionStorage, sin Supabase).
// - Todo permiso inicia estrictamente en false (principio Zero Trust DEFAULT false).
// - Cada clienta inicia exactamente con su accessStatus canónico de referencia.
// ==============================================================================

import {
    createEmptyDraftPermissions,
    LOCAL_REFERENCE_PORTAL_CLIENTS,
    PortalAccessLifecycleViewStatus,
    PortalPermissionDraftState,
} from './portalDesignerModel';

export type PortalLocalInvitationLifecycleStatus =
    | 'unprepared'
    | 'draft'
    | 'ready_for_preview'
    | 'preview_accepted_local'
    | 'expired_local'
    | 'revoked_local';

export interface PortalLocalInvitationRecord {
    readonly clientId: string;
    readonly localStatus: PortalLocalInvitationLifecycleStatus;
    readonly customMessage: string;
    readonly updatedAtLabel: string | null;
    readonly consentAcceptedLocal: boolean;
    readonly persistenceState: 'not_persisted_pending_e2';
    readonly emailDeliveryState: 'blocked_pending_e2';
}

export interface PortalLocalMemorySnapshot {
    readonly draftsByClientId: Readonly<Record<string, PortalPermissionDraftState>>;
    readonly statusByClientId: Readonly<Record<string, PortalAccessLifecycleViewStatus>>;
    readonly invitationsByClientId: Readonly<Record<string, PortalLocalInvitationRecord>>;
}

function buildEmptyLocalInvitationRecord(clientId: string): PortalLocalInvitationRecord {
    return {
        clientId,
        localStatus: 'unprepared',
        customMessage: '',
        updatedAtLabel: null,
        consentAcceptedLocal: false,
        persistenceState: 'not_persisted_pending_e2',
        emailDeliveryState: 'blocked_pending_e2',
    };
}

function getCanonicalStatusForClient(clientId: string): PortalAccessLifecycleViewStatus {
    const found = LOCAL_REFERENCE_PORTAL_CLIENTS.find((c) => c.id === clientId);
    return found ? found.accessStatus : 'unprovisioned';
}

function buildInitialSnapshot(): PortalLocalMemorySnapshot {
    const draftsByClientId: Record<string, PortalPermissionDraftState> = {};
    const statusByClientId: Record<string, PortalAccessLifecycleViewStatus> = {};
    const invitationsByClientId: Record<string, PortalLocalInvitationRecord> = {};

    for (const client of LOCAL_REFERENCE_PORTAL_CLIENTS) {
        draftsByClientId[client.id] = createEmptyDraftPermissions();
        statusByClientId[client.id] = client.accessStatus;
        invitationsByClientId[client.id] = buildEmptyLocalInvitationRecord(client.id);
    }

    return {
        draftsByClientId,
        statusByClientId,
        invitationsByClientId,
    };
}

let currentSnapshot: PortalLocalMemorySnapshot = buildInitialSnapshot();
const listeners = new Set<() => void>();

function notifyListeners(): void {
    for (const listener of listeners) {
        listener();
    }
}

export function getPortalLocalMemorySnapshot(): PortalLocalMemorySnapshot {
    return currentSnapshot;
}

export function subscribePortalLocalMemory(listener: () => void): () => void {
    listeners.add(listener);
    return () => {
        listeners.delete(listener);
    };
}

export function resetPortalLocalMemoryStore(): void {
    currentSnapshot = buildInitialSnapshot();
    notifyListeners();
}

export function setClientPortalDraftInMemory(
    clientId: string,
    nextDraft: PortalPermissionDraftState
): void {
    if (!clientId) return;
    currentSnapshot = {
        ...currentSnapshot,
        draftsByClientId: {
            ...currentSnapshot.draftsByClientId,
            [clientId]: nextDraft,
        },
    };
    notifyListeners();
}

export function updateClientPortalDraftInMemory(
    clientId: string,
    updater: (current: PortalPermissionDraftState) => PortalPermissionDraftState
): void {
    if (!clientId) return;
    const current =
        currentSnapshot.draftsByClientId[clientId] || createEmptyDraftPermissions();
    const updated = updater(current);
    if (updated === current) return;

    currentSnapshot = {
        ...currentSnapshot,
        draftsByClientId: {
            ...currentSnapshot.draftsByClientId,
            [clientId]: updated,
        },
    };
    notifyListeners();
}

export function setClientPortalStatusOverrideInMemory(
    clientId: string,
    status: PortalAccessLifecycleViewStatus
): void {
    if (!clientId) return;
    if (currentSnapshot.statusByClientId[clientId] === status) return;

    currentSnapshot = {
        ...currentSnapshot,
        statusByClientId: {
            ...currentSnapshot.statusByClientId,
            [clientId]: status,
        },
    };
    notifyListeners();
}

export function saveLocalInvitationDraftInMemory(
    clientId: string,
    customMessage: string,
    targetStatus: 'draft' | 'ready_for_preview' = 'draft'
): void {
    if (!clientId) return;
    const nextRecord: PortalLocalInvitationRecord = {
        clientId,
        localStatus: targetStatus,
        customMessage,
        updatedAtLabel:
            targetStatus === 'ready_for_preview'
                ? 'Lista para vista previa local (sin envío E2)'
                : 'Borrador guardado en RAM (sin BD E2)',
        consentAcceptedLocal: false,
        persistenceState: 'not_persisted_pending_e2',
        emailDeliveryState: 'blocked_pending_e2',
    };

    currentSnapshot = {
        ...currentSnapshot,
        invitationsByClientId: {
            ...currentSnapshot.invitationsByClientId,
            [clientId]: nextRecord,
        },
    };
    notifyListeners();
}

export function setLocalInvitationStatusInMemory(
    clientId: string,
    status: PortalLocalInvitationLifecycleStatus
): void {
    if (!clientId) return;
    if (status === 'unprepared') {
        resetLocalInvitationInMemory(clientId);
        return;
    }

    const existing =
        currentSnapshot.invitationsByClientId[clientId] || buildEmptyLocalInvitationRecord(clientId);
    const revokingOrExpiring = status === 'expired_local' || status === 'revoked_local';
    const nextStatusMap = revokingOrExpiring
        ? {
              ...currentSnapshot.statusByClientId,
              [clientId]: getCanonicalStatusForClient(clientId),
          }
        : currentSnapshot.statusByClientId;

    currentSnapshot = {
        ...currentSnapshot,
        statusByClientId: nextStatusMap,
        invitationsByClientId: {
            ...currentSnapshot.invitationsByClientId,
            [clientId]: {
                ...existing,
                localStatus: status,
                consentAcceptedLocal:
                    status === 'preview_accepted_local' ? existing.consentAcceptedLocal : false,
                updatedAtLabel: 'Actualizado en memoria RAM (sin backend E2)',
            },
        },
    };
    notifyListeners();
}

export function acceptLocalInvitationPreviewInMemory(clientId: string): boolean {
    if (!clientId) return false;
    const existing = currentSnapshot.invitationsByClientId[clientId];
    if (!existing || existing.localStatus !== 'ready_for_preview') {
        return false;
    }

    currentSnapshot = {
        ...currentSnapshot,
        statusByClientId: {
            ...currentSnapshot.statusByClientId,
            [clientId]: 'active',
        },
        invitationsByClientId: {
            ...currentSnapshot.invitationsByClientId,
            [clientId]: {
                ...existing,
                localStatus: 'preview_accepted_local',
                consentAcceptedLocal: true,
                updatedAtLabel: 'Aceptada solo en vista previa RAM (pendiente E2)',
            },
        },
    };
    notifyListeners();
    return true;
}

export function resetLocalInvitationInMemory(clientId: string): void {
    if (!clientId) return;
    currentSnapshot = {
        ...currentSnapshot,
        statusByClientId: {
            ...currentSnapshot.statusByClientId,
            [clientId]: getCanonicalStatusForClient(clientId),
        },
        invitationsByClientId: {
            ...currentSnapshot.invitationsByClientId,
            [clientId]: buildEmptyLocalInvitationRecord(clientId),
        },
    };
    notifyListeners();
}
