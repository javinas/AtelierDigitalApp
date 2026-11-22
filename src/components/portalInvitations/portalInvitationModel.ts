// ==============================================================================
// ATELIER DIGITAL — MODELO LOCAL DE FLUJO DE INVITACIONES M09
// Archivo: src/components/portalInvitations/portalInvitationModel.ts
// ==============================================================================
// Lógica pura y catálogos profundamente congelados (Object.freeze) para el flujo
// completo de invitaciones M09 en memoria local (Diseñadora -> Vista Previa
// Correo -> Aceptación Clienta -> Acceso Condicionado).
//
// GARANTÍAS ESTRICTAS:
// - Cero imports y cero llamadas a Supabase / PostgREST / Edge Functions.
// - Cero tokens o hashes criptográficos ficticios.
// - Cero envío real de correos y cero simulación de persistencia remota.
// - Respeta Zero Trust DEFAULT false, Doble Candado, deny-overrides y
//   aislamiento estricto por clientId.
// ==============================================================================

import {
    CREATION_READ_ITEMS,
    createEmptyDraftPermissions,
    ENABLED_ACTION_ITEMS,
    evaluateMixedDraftPermission,
    GLOBAL_READ_ITEMS,
    LOCAL_REFERENCE_PORTAL_CLIENTS,
    makePermissionKey,
    PortalAccessLifecycleViewStatus,
    PortalPermissionDraftState,
    PortalSafeClientSummary,
} from '../portal/portalDesignerModel';
import {
    PortalLocalInvitationLifecycleStatus,
    PortalLocalInvitationRecord,
} from '../portal/portalLocalMemoryStore';

export interface LocalInvitationStatusUiMeta {
    readonly status: PortalLocalInvitationLifecycleStatus;
    readonly badgeLabel: string;
    readonly shortLabel: string;
    readonly badgeBg: string;
    readonly badgeText: string;
    readonly badgeBorder: string;
    readonly designerHint: string;
    readonly clientHeadline: string;
    readonly clientBody: string;
}

export interface InvitationCreationPermissionSummary {
    readonly creationId: string;
    readonly creationName: string;
    readonly subModules: readonly string[];
    readonly quoteLabel: string;
    readonly quoteDeniedByOverride: boolean;
}

export interface InvitationPermissionsSummary {
    readonly totalConfigured: number;
    readonly isZeroTrustEmpty: boolean;
    readonly globalLabels: readonly string[];
    readonly creationSummaries: readonly InvitationCreationPermissionSummary[];
    readonly actionLabels: readonly string[];
    readonly summaryLines: readonly string[];
}

export interface LocalInvitationEmailPreview {
    readonly fromLabel: string;
    readonly toName: string;
    readonly toEmail: string;
    readonly subject: string;
    readonly customMessage: string;
    readonly permissionsBullets: readonly string[];
    readonly linkPlaceholder: string;
    readonly legalFooter: string;
    readonly deliveryDisclosure: string;
}

export interface InvitationRecipientGuardResult {
    readonly allowed: boolean;
    readonly reason: 'matched' | 'mismatch_blocked' | 'unknown_client';
    readonly message: string;
}

export interface InvitationPendingE2Limitation {
    readonly id: string;
    readonly phase: string;
    readonly title: string;
    readonly detail: string;
}

function deepFreeze<T>(value: T): T {
    if (value && typeof value === 'object' && !Object.isFrozen(value)) {
        Object.freeze(value);
        for (const prop of Object.values(value as Record<string, unknown>)) {
            deepFreeze(prop);
        }
    }
    return value;
}

export const LOCAL_INVITATION_STATUS_META: Readonly<
    Record<PortalLocalInvitationLifecycleStatus, LocalInvitationStatusUiMeta>
> = deepFreeze({
    unprepared: {
        status: 'unprepared',
        badgeLabel: 'SIN PREPARAR (RAM)',
        shortLabel: 'Sin preparar',
        badgeBg: '#F2ECE4',
        badgeText: '#6F645A',
        badgeBorder: '#DED3C4',
        designerHint:
            'Aún no se ha redactado borrador de invitación local para esta clienta.',
        clientHeadline: 'Invitación no preparada todavía',
        clientBody:
            'No existe una invitación preparada para tu expediente en la vista previa local.',
    },
    draft: {
        status: 'draft',
        badgeLabel: 'BORRADOR LOCAL (RAM)',
        shortLabel: 'Borrador',
        badgeBg: '#FAF3E5',
        badgeText: '#7D581D',
        badgeBorder: '#E5CE9E',
        designerHint:
            'Borrador guardado únicamente en memoria RAM. La clienta todavía no puede aceptarlo hasta marcarlo listo para vista previa.',
        clientHeadline: 'Invitación en preparación por el atelier',
        clientBody:
            'La diseñadora está preparando tu invitación en borrador local y aún no la ha habilitado para revisión.',
    },
    ready_for_preview: {
        status: 'ready_for_preview',
        badgeLabel: 'LISTA PARA VISTA PREVIA (SIN ENVÍO E2)',
        shortLabel: 'Lista vista previa',
        badgeBg: '#EBF4ED',
        badgeText: '#2F5B39',
        badgeBorder: '#B7D4BE',
        designerHint:
            'Vista previa lista para revisar en la experiencia de aceptación de la clienta. No se ha emitido token ni correo real (pendiente E2).',
        clientHeadline: 'Tu invitación local está lista para revisión',
        clientBody:
            'Puedes revisar el mensaje de Katherine Carroll, los módulos configurados bajo Zero Trust y validar la aceptación únicamente en memoria RAM.',
    },
    preview_accepted_local: {
        status: 'preview_accepted_local',
        badgeLabel: 'ACEPTADA EN VISTA PREVIA RAM (PENDIENTE E2)',
        shortLabel: 'Aceptada (RAM)',
        badgeBg: '#F1F7F2',
        badgeText: '#3D6346',
        badgeBorder: '#C2DFCA',
        designerHint:
            'Aceptación confirmada únicamente en la sesión RAM local. En PostgreSQL/Supabase real no existe vinculación hasta desplegar E1 y E2.',
        clientHeadline: 'Confirmación registrada solo en vista previa local',
        clientBody:
            'Aceptaste el consentimiento dentro de esta prueba en memoria. Ahora puedes acceder al portal condicionado (/mi-portal) según los permisos configurados.',
    },
    expired_local: {
        status: 'expired_local',
        badgeLabel: 'EXPIRADA EN PRUEBA LOCAL (RAM)',
        shortLabel: 'Expirada (local)',
        badgeBg: '#F9F0E3',
        badgeText: '#8E5617',
        badgeBorder: '#E3C39B',
        designerHint:
            'Marcada como expirada en prueba local RAM para validar el bloqueo de aceptación sin persistencia.',
        clientHeadline: 'Invitación expirada en prueba local',
        clientBody:
            'El plazo de vigencia de esta invitación de prueba ha vencido. Solicita a Katherine Carroll preparar una nueva invitación.',
    },
    revoked_local: {
        status: 'revoked_local',
        badgeLabel: 'REVOCADA EN PRUEBA LOCAL (RAM)',
        shortLabel: 'Revocada (local)',
        badgeBg: '#FAF2F2',
        badgeText: '#9E3B3B',
        badgeBorder: '#E8C5C5',
        designerHint:
            'Marcada como revocada en prueba local RAM. Bloquea aceptación y limpia cualquier acceso de prueba previo.',
        clientHeadline: 'Invitación revocada por el atelier',
        clientBody:
            'Esta invitación fue revocada y no permite activar acceso ni consultar prendas o datos del expediente.',
    },
});

export const M09_INVITATION_E2_LIMITATIONS: readonly InvitationPendingE2Limitation[] = deepFreeze([
    {
        id: 'lim-e1-sql',
        phase: 'Entrega E1 (SQL & RLS)',
        title: 'Tablas M09 sin desplegar en PostgreSQL Staging',
        detail:
            'client_portal_access, client_portal_invitations, client_portal_permissions y client_portal_activity_log siguen sin ejecución ni validación empírica en Staging 17.11.',
    },
    {
        id: 'lim-e2-token',
        phase: 'Entrega E2 (Criptografía y Saga)',
        title: 'Cero tokens CSPRNG y cero hashes SHA-256 locales',
        detail:
            'La emisión real de token de 256 bits, reserva temporal lease Saga (claim/release/finalize) y vinculación auth_user_id requieren la Edge Function accept-portal-invitation.',
    },
    {
        id: 'lim-e2-mail',
        phase: 'Entrega E2 (Correo Real)',
        title: 'Sin despacho real de correos electrónicos',
        detail:
            'La vista previa de correo muestra el contenido editorial sin enviar mensajes externos por SMTP/Resend.',
    },
    {
        id: 'lim-e2-consent',
        phase: 'Entrega E2 (Consentimiento e IP)',
        title: 'Trazabilidad IP real en gateway pendiente de verificación',
        detail:
            'El consentimiento marcado en pantalla solo habilita la vista previa local en RAM; no escribe registros legales ni eventos business en BD.',
    },
]);

export function getCanonicalInvitationClient(clientId: string): PortalSafeClientSummary | null {
    return LOCAL_REFERENCE_PORTAL_CLIENTS.find((c) => c.id === clientId) || null;
}

export function buildDefaultInvitationMessage(client: PortalSafeClientSummary): string {
    const firstName = client.fullName.split(' ')[0] || client.fullName;
    return (
        `Querida ${firstName}, he preparado un espacio confidencial en Atelier Digital para compartir contigo únicamente los avances, bocetos y citas habilitados para tu proyecto en ${client.city}. ` +
        `Podrás ingresar con serenidad y privacidad en cuanto completes la activación de tu enlace personalizado.`
    );
}

export function buildInvitationPermissionsSummary(params: {
    client: PortalSafeClientSummary;
    draft: PortalPermissionDraftState;
}): InvitationPermissionsSummary {
    const { client, draft } = params;
    const globalLabels: string[] = [];
    const actionLabels: string[] = [];
    const creationSummaries: InvitationCreationPermissionSummary[] = [];
    const summaryLines: string[] = [];
    let totalConfigured = 0;

    for (const item of GLOBAL_READ_ITEMS) {
        const res = evaluateMixedDraftPermission({
            accessStatus: 'active',
            draft,
            resource: item.resource,
            action: item.action,
            creationId: null,
        });
        if (res.draftConfigured) {
            totalConfigured += 1;
            globalLabels.push(item.title);
            summaryLines.push(`Nivel 1 Global · ${item.title}`);
        }
    }

    const globalQuoteEnabled = Boolean(
        draft.globalGrants[makePermissionKey('quotations', 'view')]
    );

    for (const cr of client.creations) {
        const masterEval = evaluateMixedDraftPermission({
            accessStatus: 'active',
            draft,
            resource: 'creations',
            action: 'view',
            creationId: cr.id,
        });
        if (!masterEval.draftConfigured) {
            continue;
        }

        totalConfigured += 1;
        const subModules: string[] = [];
        for (const sub of CREATION_READ_ITEMS) {
            const subEval = evaluateMixedDraftPermission({
                accessStatus: 'active',
                draft,
                resource: sub.resource,
                action: sub.action,
                creationId: cr.id,
            });
            if (subEval.draftConfigured) {
                totalConfigured += 1;
                subModules.push(sub.title);
            }
        }

        const quoteMode = draft.creationQuoteOverrides[cr.id] || 'inherit';
        const quoteEval = evaluateMixedDraftPermission({
            accessStatus: 'active',
            draft,
            resource: 'quotations',
            action: 'view',
            creationId: cr.id,
        });

        let quoteLabel = 'Cotización oculta (Zero Trust DEFAULT false)';
        if (quoteEval.reason === 'denied_by_override') {
            quoteLabel = 'Cotización denegada por regla específica (deny-overrides)';
        } else if (quoteMode === 'allow') {
            totalConfigured += 1;
            quoteLabel = 'Cotización oficial autorizada por excepción en esta prenda';
        } else if (quoteEval.effectiveAllowed && globalQuoteEnabled) {
            quoteLabel = 'Cotización oficial heredada de Nivel 1 Global';
        }

        creationSummaries.push({
            creationId: cr.id,
            creationName: cr.name,
            subModules,
            quoteLabel,
            quoteDeniedByOverride: quoteEval.reason === 'denied_by_override',
        });

        const subSummaryText =
            subModules.length > 0 ? subModules.join(', ') : 'Solo ficha general autorizada';
        summaryLines.push(
            `Creación · ${cr.name}: ${subSummaryText} · ${quoteLabel}`
        );
    }

    for (const act of ENABLED_ACTION_ITEMS) {
        const res = evaluateMixedDraftPermission({
            accessStatus: 'active',
            draft,
            resource: act.resource,
            action: act.action,
            creationId: null,
        });
        if (res.draftConfigured) {
            totalConfigured += 1;
            actionLabels.push(act.title);
            summaryLines.push(`Acción / Canal · ${act.title} (pendiente flujo backend M09)`);
        }
    }

    const hasExplicitDenies = Object.values(draft.creationQuoteOverrides).some(
        (m) => m === 'deny'
    );

    return {
        totalConfigured,
        isZeroTrustEmpty: totalConfigured === 0 && !hasExplicitDenies,
        globalLabels,
        creationSummaries,
        actionLabels,
        summaryLines,
    };
}

export function buildLocalInvitationEmailPreview(params: {
    client: PortalSafeClientSummary;
    record: PortalLocalInvitationRecord;
    permissionsSummary: InvitationPermissionsSummary;
}): LocalInvitationEmailPreview {
    const { client, record, permissionsSummary } = params;
    const customText = record.customMessage.trim() || buildDefaultInvitationMessage(client);
    const permissionsBullets =
        permissionsSummary.summaryLines.length > 0
            ? permissionsSummary.summaryLines
            : [
                  'Sin permisos de consulta encendidos todavía (Zero Trust DEFAULT false): al ingresar verás únicamente tu pantalla de bienvenida privada hasta que Katherine autorice módulos específicos.',
              ];

    return {
        fromLabel: 'Atelier Digital · By Katherine Carroll <no-reply-pendiente-e2@atelier.invalid>',
        toName: client.fullName,
        toEmail: client.email,
        subject: 'Invitación privada pendiente de emisión — Tu Atelier Digital By Katherine Carroll',
        customMessage: customText,
        permissionsBullets,
        linkPlaceholder:
            '[ENLACE PRIVADO ÚNICO PENDIENTE DE BACKEND E2 — SIN TOKEN SIMULADO]',
        legalFooter:
            'Protección de datos Ley 1581 de 2012 · Vista previa generada en memoria RAM sin despacho SMTP ni token criptográfico.',
        deliveryDisclosure:
            'Estado real de entrega: No enviada · Emisión de enlace y envío automático bloqueados hasta desplegar E2.',
    };
}

export function evaluateInvitationRecipientGuard(params: {
    targetClientId: string;
    viewerClientId: string;
}): InvitationRecipientGuardResult {
    const { targetClientId, viewerClientId } = params;
    const targetClient = getCanonicalInvitationClient(targetClientId);
    const viewerClient = getCanonicalInvitationClient(viewerClientId);

    if (!targetClient || !viewerClient) {
        return {
            allowed: false,
            reason: 'unknown_client',
            message: 'Expediente de referencia no reconocido en memoria.',
        };
    }

    if (targetClient.id !== viewerClient.id) {
        return {
            allowed: false,
            reason: 'mismatch_blocked',
            message: `Aislamiento multi-clienta activo: la sesión de vista previa (${viewerClient.fullName}) no coincide con la destinataria (${targetClient.fullName}). Exposición bloqueada en cero.`,
        };
    }

    return {
        allowed: true,
        reason: 'matched',
        message: `Destinataria verificada: ${targetClient.fullName}.`,
    };
}

export function resolveEffectivePreviewAccessStatus(
    clientId: string,
    statusByClientId: Readonly<Record<string, PortalAccessLifecycleViewStatus>>
): PortalAccessLifecycleViewStatus {
    return (
        statusByClientId[clientId] ||
        getCanonicalInvitationClient(clientId)?.accessStatus ||
        'unprovisioned'
    );
}

export function resolveDraftForInvitation(
    clientId: string,
    draftsByClientId: Readonly<Record<string, PortalPermissionDraftState>>
): PortalPermissionDraftState {
    return draftsByClientId[clientId] || createEmptyDraftPermissions();
}
