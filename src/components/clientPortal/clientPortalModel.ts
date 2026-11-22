// ==============================================================================
// ATELIER DIGITAL — MODELO LOCAL MULTI-TENANT: PORTAL DE LA CLIENTA (M09)
// Archivo: src/components/clientPortal/clientPortalModel.ts
// ==============================================================================
// Capa pura en memoria para la primera experiencia visual del Portal de la
// Clienta (Atelier de Autor — By Katherine Carroll).
//
// GARANTÍAS ESTRICTAS:
// - Cero imports y cero llamadas a Supabase, PostgREST o Edge Functions.
// - Datos de referencia profundamente congelados con Object.freeze.
// - Gobernanza Zero Trust (DEFAULT false en todos los permisos).
// - Doble Candado obligatorio para recursos de creación (creations:view).
// - Precedencia deny-overrides en cotizaciones por creación.
// - Aislamiento estricto multi-clienta por clientId.
// - Cero exposición de datos reservados del taller ni medidas anatómicas.
// ==============================================================================

import {
    PORTAL_ACTIONS,
    PORTAL_RESOURCES,
    PortalAccessStatus,
    PortalAction,
    PortalResource,
} from '../../types/portal';

export type ClientPortalLifecycleStatus = PortalAccessStatus | 'unprovisioned';

export type ClientPortalSectionId =
    | 'inicio'
    | 'creaciones'
    | 'citas'
    | 'seguimiento'
    | 'comunicacion';

export type ClientQuoteOverrideMode = 'inherit' | 'allow' | 'deny';

export type ClientPermissionEvaluationReason =
    | 'allowed'
    | 'disabled_zero_trust'
    | 'blocked_by_access_status'
    | 'blocked_by_double_lock'
    | 'blocked_global_scope_forbidden'
    | 'denied_by_override';

export interface ClientSafeSketchItem {
    readonly id: string;
    readonly title: string;
    readonly silhouetteLabel: string;
    readonly approvalStateLabel: string;
    readonly plateCode: string;
}

export interface ClientSafeFabricItem {
    readonly id: string;
    readonly aestheticName: string;
    readonly colorHarmony: string;
    readonly drapeFinish: string;
    readonly editorialNote: string;
}

export interface ClientSafeViewer3dSummary {
    readonly isPrepared: boolean;
    readonly silhouetteTitle: string;
    readonly stageLabel: string;
    readonly notice: string;
}

export interface ClientSafeCreation {
    readonly id: string;
    readonly clientId: string;
    readonly name: string;
    readonly occasion: string;
    readonly garmentType: string;
    readonly stageLabel: string;
    readonly targetDate: string | null;
    readonly collectionNote: string;
    readonly sketches: readonly ClientSafeSketchItem[];
    readonly fabrics: readonly ClientSafeFabricItem[];
    readonly viewer3dSummary: ClientSafeViewer3dSummary;
}

export interface ClientSafeQuote {
    readonly id: string;
    readonly clientId: string;
    readonly creationId: string;
    readonly quoteCode: string;
    readonly title: string;
    readonly currency: 'COP' | 'USD';
    readonly totalFormatted: string;
    readonly paymentPlanLabel: string;
    readonly status: 'sent' | 'accepted' | 'expired';
    readonly statusLabel: string;
    readonly issuedDate: string;
    readonly validUntil: string;
}

export interface ClientSafeAppointment {
    readonly id: string;
    readonly clientId: string;
    readonly creationId: string | null;
    readonly title: string;
    readonly dateBogota: string;
    readonly timeRangeBogota: string;
    readonly spaceLabel: string;
    readonly status: 'scheduled' | 'confirmed' | 'completed';
    readonly statusLabel: string;
    readonly clientVisible: true;
    readonly preparationNote: string;
}

export interface ClientSafeFittingRound {
    readonly id: string;
    readonly clientId: string;
    readonly creationId: string;
    readonly creationName: string;
    readonly roundNumber: number;
    readonly roundLabel: string;
    readonly dateBogota: string;
    readonly statusLabel: string;
    readonly clientSummary: string;
    readonly summaryReady: true;
}

export interface ClientSafeMeasurementSession {
    readonly id: string;
    readonly clientId: string;
    readonly sessionDate: string;
    readonly versionNumber: number;
    readonly unitSystem: 'cm';
    readonly status: 'verified' | 'completed';
    readonly statusLabel: string;
}

export interface ClientSafeMessage {
    readonly id: string;
    readonly clientId: string;
    readonly creationId: string | null;
    readonly authorLabel: string;
    readonly dateBogota: string;
    readonly subject: string;
    readonly body: string;
    readonly channelLabel: string;
}

export interface ClientPortalReferenceRecord {
    readonly id: string;
    readonly fullName: string;
    readonly greetingName: string;
    readonly city: string;
    readonly stylePreference: string;
    readonly defaultAccessStatus: ClientPortalLifecycleStatus;
    readonly isLocalReference: true;
    readonly creations: readonly ClientSafeCreation[];
    readonly quotes: readonly ClientSafeQuote[];
    readonly appointments: readonly ClientSafeAppointment[];
    readonly fittingRounds: readonly ClientSafeFittingRound[];
    readonly measurementSessions: readonly ClientSafeMeasurementSession[];
    readonly messages: readonly ClientSafeMessage[];
}

export interface ClientPortalPermissionsState {
    readonly globalGrants: Readonly<Record<string, boolean>>;
    readonly creationGrants: Readonly<Record<string, Readonly<Record<string, boolean>>>>;
    readonly creationQuoteOverrides: Readonly<Record<string, ClientQuoteOverrideMode>>;
}

export interface ClientPermissionEvaluation {
    readonly allowed: boolean;
    readonly reason: ClientPermissionEvaluationReason;
}

export interface ClientAccessLifecycleMeta {
    readonly status: ClientPortalLifecycleStatus;
    readonly badgeLabel: string;
    readonly shortLabel: string;
    readonly badgeBg: string;
    readonly badgeText: string;
    readonly badgeBorder: string;
    readonly title: string;
    readonly headline: string;
    readonly explanation: string;
    readonly privacyGuarantee: string;
    readonly guidanceCta: string;
}

export interface AuthorizedCreationProjection {
    readonly creation: ClientSafeCreation;
    readonly canViewSketches: boolean;
    readonly canViewFabrics: boolean;
    readonly canViewFittings: boolean;
    readonly canView3dViewer: boolean;
    readonly canViewQuote: boolean;
    readonly quoteBlockedByDenyOverride: boolean;
    readonly quote: ClientSafeQuote | null;
    readonly canApproveSketches: boolean;
    readonly canDownloadSketches: boolean;
    readonly canDownloadQuote: boolean;
}

export interface ClientPortalAuthorizedView {
    readonly client: ClientPortalReferenceRecord | null;
    readonly accessStatus: ClientPortalLifecycleStatus;
    readonly isAccessible: boolean;
    readonly enabledPermissionCount: number;
    readonly authorizedSectionCount: number;
    readonly isZeroTrustEmpty: boolean;
    readonly authorizedCreations: readonly AuthorizedCreationProjection[];
    readonly authorizedQuotes: readonly ClientSafeQuote[];
    readonly authorizedAppointments: readonly ClientSafeAppointment[];
    readonly authorizedFittings: readonly ClientSafeFittingRound[];
    readonly authorizedMeasurementSessions: readonly ClientSafeMeasurementSession[];
    readonly authorizedMessages: readonly ClientSafeMessage[];
    readonly canViewAppointments: boolean;
    readonly canViewMeasurements: boolean;
    readonly canViewGlobalQuotes: boolean;
    readonly canObserveMessaging: boolean;
    readonly canApproveSketchesAction: boolean;
    readonly canDownloadSketchesAction: boolean;
    readonly canDownloadQuotesAction: boolean;
}

export const CREATION_SCOPED_ONLY_VIEW_RESOURCES: readonly PortalResource[] = Object.freeze([
    'creations',
    'sketches',
    'fabrics',
    'fittings',
    '3d_viewer',
]);

export const CLIENT_PORTAL_SECTIONS: readonly {
    readonly id: ClientPortalSectionId;
    readonly label: string;
    readonly shortLabel: string;
}[] = Object.freeze([
    Object.freeze({ id: 'inicio', label: 'Inicio', shortLabel: 'Inicio' }),
    Object.freeze({ id: 'creaciones', label: 'Creaciones', shortLabel: 'Creaciones' }),
    Object.freeze({ id: 'citas', label: 'Citas', shortLabel: 'Citas' }),
    Object.freeze({ id: 'seguimiento', label: 'Seguimiento', shortLabel: 'Seguimiento' }),
    Object.freeze({ id: 'comunicacion', label: 'Comunicación', shortLabel: 'Mensajes' }),
]);

export const CLIENT_ACCESS_LIFECYCLE_META: Readonly<
    Record<ClientPortalLifecycleStatus, ClientAccessLifecycleMeta>
> = Object.freeze({
    active: Object.freeze({
        status: 'active',
        badgeLabel: 'PORTAL ACTIVO',
        shortLabel: 'Activo',
        badgeBg: '#F1F7F2',
        badgeText: '#3D6346',
        badgeBorder: '#C2DFCA',
        title: 'Tu Atelier Privado',
        headline: 'Acceso habilitado con curaduría selectiva',
        explanation:
            'Visualizas únicamente las creaciones, citas, sesiones y documentos que Katherine Carroll ha autorizado expresamente para tu expediente.',
        privacyGuarantee: 'Aislamiento estricto por clienta · Principio Zero Trust DEFAULT false.',
        guidanceCta: 'Consultar módulos habilitados',
    }),
    unprovisioned: Object.freeze({
        status: 'unprovisioned',
        badgeLabel: 'SIN INVITACIÓN',
        shortLabel: 'Sin invitación',
        badgeBg: '#F2ECE4',
        badgeText: '#6F645A',
        badgeBorder: '#DED3C4',
        title: 'Tu acceso privado aún no ha sido emitido',
        headline: 'Sin invitación al Portal de Clientas',
        explanation:
            'Nuestro equipo editorial prepara tu espacio digital de forma personalizada. Cuando Katherine Carroll habilite tu expediente, recibirás un enlace privado de un solo uso.',
        privacyGuarantee:
            'Por seguridad y confidencialidad, ningún dato del taller es visible antes de completar la invitación.',
        guidanceCta: 'Solicitar enlace personalizado con el atelier',
    }),
    invited: Object.freeze({
        status: 'invited',
        badgeLabel: 'INVITACIÓN PENDIENTE',
        shortLabel: 'Invitada',
        badgeBg: '#FAF3E5',
        badgeText: '#7D581D',
        badgeBorder: '#E5CE9E',
        title: 'Invitación pendiente de activación',
        headline: 'Completa tu vinculación mediante enlace privado',
        explanation:
            'Existe una invitación emitida para tu correo, pero todavía no se ha formalizado la aceptación ni el consentimiento de acceso al portal.',
        privacyGuarantee:
            'Hasta confirmar tu enlace en /portal/invite, las vistas del portal permanecen cerradas en cero exposición.',
        guidanceCta: 'Abrir enlace de invitación recibido',
    }),
    suspended: Object.freeze({
        status: 'suspended',
        badgeLabel: 'ACCESO SUSPENDIDO',
        shortLabel: 'Suspendido',
        badgeBg: '#F9F0E3',
        badgeText: '#8E5617',
        badgeBorder: '#E3C39B',
        title: 'Portal en pausa temporal',
        headline: 'Tu acceso se encuentra suspendido preventivamente',
        explanation:
            'Katherine Carroll ha puesto tu consulta digital en pausa temporal mientras se actualiza la curaduría o el estado de tu proyecto de autor.',
        privacyGuarantee:
            'Tus diseños y citas permanecen resguardados; ninguna información se expone durante una suspensión.',
        guidanceCta: 'Contactar al atelier para reactivación',
    }),
    revoked: Object.freeze({
        status: 'revoked',
        badgeLabel: 'ACCESO REVOCADO',
        shortLabel: 'Revocado',
        badgeBg: '#FAF2F2',
        badgeText: '#9E3B3B',
        badgeBorder: '#E8C5C5',
        title: 'Acceso digital finalizado',
        headline: 'Este enlace privado ha sido revocado',
        explanation:
            'La habilitación de consulta para este expediente concluyó definitivamente. Si inicias un nuevo proyecto con el atelier, se emitirá una autorización independiente.',
        privacyGuarantee:
            'Cero datos expuestos tras revocación conforme a protección de confidencialidad Ley 1581 de 2012.',
        guidanceCta: 'Comunicarse con atención privada',
    }),
});

export function makeClientPermissionKey(
    resource: PortalResource,
    action: PortalAction
): string {
    return `${resource}:${action}`;
}

export function isCanonicalClientPermission(
    resource: PortalResource,
    action: PortalAction
): boolean {
    return PORTAL_RESOURCES.includes(resource) && PORTAL_ACTIONS.includes(action);
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

export const CLIENT_PORTAL_REFERENCE_RECORDS: readonly ClientPortalReferenceRecord[] = deepFreeze([
    {
        id: 'ref-client-valeria-01',
        fullName: 'Valeria Mendoza Restrepo',
        greetingName: 'Valeria',
        city: 'Bogotá D. C.',
        stylePreference: 'Sastrería arquitectónica, líneas puras y caída fluida en seda mate.',
        defaultAccessStatus: 'active',
        isLocalReference: true,
        creations: [
            {
                id: 'ref-creation-01a',
                clientId: 'ref-client-valeria-01',
                name: 'Vestido Novia Alabastro — Corte Imperio',
                occasion: 'Ceremonia Principal',
                garmentType: 'Alta Costura Nupcial',
                stageLabel: 'Prueba en tela definitiva',
                targetDate: '2026-12-18',
                collectionNote:
                    'Silueta limpia con escote velado y cola catedral desmontable pensada para movimiento ligero.',
                sketches: [
                    {
                        id: 'sk-01a-1',
                        title: 'Lámina I — Silueta frontal e imperio alto',
                        silhouetteLabel: 'Escote barco suave · Caída columna',
                        approvalStateLabel: 'Disponible para revisión visual',
                        plateCode: 'BK-01A-I',
                    },
                    {
                        id: 'sk-01a-2',
                        title: 'Lámina II — Espalda velada y botonadura forrada',
                        silhouetteLabel: 'Espalda lágrima · Cola catedral 1.6 m',
                        approvalStateLabel: 'Disponible para revisión visual',
                        plateCode: 'BK-01A-II',
                    },
                ],
                fabrics: [
                    {
                        id: 'fab-01a-1',
                        aestheticName: 'Crepé de seda pesado mate',
                        colorHarmony: 'Marfil Alabastro',
                        drapeFinish: 'Caída noble con estructura sutil y tacto aterciopelado',
                        editorialNote: 'Base principal del cuerpo y falda.',
                    },
                    {
                        id: 'fab-01a-2',
                        aestheticName: 'Organza translúcida de seda',
                        colorHarmony: 'Blanco Hueso Velado',
                        drapeFinish: 'Ligereza etérea para mangas y sobrefalda desmontable',
                        editorialNote: 'Acabado artesanal en dobladillo enrollado a mano.',
                    },
                ],
                viewer3dSummary: {
                    isPrepared: false,
                    silhouetteTitle: 'Silueta paramétrica Alabastro Imperio',
                    stageLabel: 'Pendiente servicio 3D M09',
                    notice: 'La visualización interactiva WebGL conectada al expediente requiere la entrega backend de escena 3D M09.',
                },
            },
            {
                id: 'ref-creation-01b',
                clientId: 'ref-client-valeria-01',
                name: 'Capa Ceremonial Organza de Seda',
                occasion: 'Recepción Nocturna',
                garmentType: 'Sobremedida Gala',
                stageLabel: 'Diseño conceptual aprobado',
                targetDate: '2026-12-18',
                collectionNote:
                    'Pieza envolvente de hombro limpio pensada para complementar el vestido principal al caer la tarde.',
                sketches: [
                    {
                        id: 'sk-01b-1',
                        title: 'Lámina I — Caída asimétrica sobre hombros',
                        silhouetteLabel: 'Capa fluida sin costuras visibles',
                        approvalStateLabel: 'Aprobación visual registrada en atelier',
                        plateCode: 'BK-01B-I',
                    },
                ],
                fabrics: [
                    {
                        id: 'fab-01b-1',
                        aestheticName: 'Gasa doble y ribete en satén champagne',
                        colorHarmony: 'Marfil Champagne',
                        drapeFinish: 'Velo semitransparente con halo luminoso',
                        editorialNote: 'Cierre discreto en cuello con broche forrado.',
                    },
                ],
                viewer3dSummary: {
                    isPrepared: false,
                    silhouetteTitle: 'Silueta envolvente Organza Noche',
                    stageLabel: 'Pendiente servicio 3D M09',
                    notice: 'Requiere integración del servicio 3D M09 para carga de mallas autorizadas.',
                },
            },
        ],
        quotes: [
            {
                id: 'qt-01a',
                clientId: 'ref-client-valeria-01',
                creationId: 'ref-creation-01a',
                quoteCode: 'COT-2026-114',
                title: 'Propuesta Comercial — Vestido Novia Alabastro',
                currency: 'COP',
                totalFormatted: '$ 14.800.000 COP',
                paymentPlanLabel: '50% al inicio · 30% en segunda prueba · 20% en entrega',
                status: 'accepted',
                statusLabel: 'Aceptada',
                issuedDate: '2026-10-12',
                validUntil: '2026-11-30',
            },
            {
                id: 'qt-01b',
                clientId: 'ref-client-valeria-01',
                creationId: 'ref-creation-01b',
                quoteCode: 'COT-2026-129',
                title: 'Propuesta Comercial — Capa Ceremonial Organza',
                currency: 'COP',
                totalFormatted: '$ 4.200.000 COP',
                paymentPlanLabel: '50% reserva de confección · 50% entrega final',
                status: 'sent',
                statusLabel: 'Enviada',
                issuedDate: '2026-11-10',
                validUntil: '2026-12-05',
            },
        ],
        appointments: [
            {
                id: 'apt-01-1',
                clientId: 'ref-client-valeria-01',
                creationId: 'ref-creation-01a',
                title: 'Segunda prueba de calce en tela definitiva',
                dateBogota: '2026-11-26',
                timeRangeBogota: '15:00 – 16:30 (Hora Colombia)',
                spaceLabel: 'Salón Privado Atelier · Zona G, Bogotá',
                status: 'confirmed',
                statusLabel: 'Confirmada',
                clientVisible: true,
                preparationNote: 'Traer los zapatos definitivos de ceremonia y lencería sugerida.',
            },
            {
                id: 'apt-01-2',
                clientId: 'ref-client-valeria-01',
                creationId: 'ref-creation-01b',
                title: 'Revisión de caída de capa y largo final',
                dateBogota: '2026-12-09',
                timeRangeBogota: '10:30 – 11:30 (Hora Colombia)',
                spaceLabel: 'Salón de Espejos · Atelier By Katherine Carroll',
                status: 'scheduled',
                statusLabel: 'Programada',
                clientVisible: true,
                preparationNote: 'Sesión conjunta con peinado de referencia si deseas evaluarlo.',
            },
        ],
        fittingRounds: [
            {
                id: 'fit-01a-1',
                clientId: 'ref-client-valeria-01',
                creationId: 'ref-creation-01a',
                creationName: 'Vestido Novia Alabastro — Corte Imperio',
                roundNumber: 1,
                roundLabel: 'Ronda 1 · Glasilla de Arquitectura',
                dateBogota: '2026-11-05',
                statusLabel: 'Calce validado',
                clientSummary:
                    'Aplomo de talle imperio verificado con postura natural y altura de tacón confirmada.',
                summaryReady: true,
            },
            {
                id: 'fit-01a-2',
                clientId: 'ref-client-valeria-01',
                creationId: 'ref-creation-01a',
                creationName: 'Vestido Novia Alabastro — Corte Imperio',
                roundNumber: 2,
                roundLabel: 'Ronda 2 · Seda Definitiva y Caída',
                dateBogota: '2026-11-17',
                statusLabel: 'Resumen autorizado',
                clientSummary:
                    'Afinado el movimiento de la sobrefalda y confirmación de escote velado para ronda final.',
                summaryReady: true,
            },
        ],
        measurementSessions: [
            {
                id: 'meas-01-1',
                clientId: 'ref-client-valeria-01',
                sessionDate: '2026-10-08',
                versionNumber: 1,
                unitSystem: 'cm',
                status: 'completed',
                statusLabel: 'Completada',
            },
            {
                id: 'meas-01-2',
                clientId: 'ref-client-valeria-01',
                sessionDate: '2026-11-04',
                versionNumber: 2,
                unitSystem: 'cm',
                status: 'verified',
                statusLabel: 'Verificada por atelier',
            },
        ],
        messages: [
            {
                id: 'msg-01-1',
                clientId: 'ref-client-valeria-01',
                creationId: null,
                authorLabel: 'Dirección Creativa · Atelier By Katherine Carroll',
                dateBogota: '2026-11-18 · 11:20 BOG',
                subject: 'Bienvenida a tu curaduría digital de ceremonia',
                body: 'Valeria, hemos preparado este espacio confidencial para que revises únicamente los avances habilitados de tu proyecto. Para nuestra cita del 26 de noviembre te sugerimos traer tus zapatos definitivos.',
                channelLabel: 'Nota editorial autorizada',
            },
            {
                id: 'msg-01-2',
                clientId: 'ref-client-valeria-01',
                creationId: 'ref-creation-01a',
                authorLabel: 'Mesa de Alta Costura',
                dateBogota: '2026-11-19 · 16:05 BOG',
                subject: 'Actualización visual · Láminas de Vestido Alabastro',
                body: 'Las dos láminas de estudio del cuerpo imperio y espalda velada quedaron listas para tu observación tranquila desde este portal.',
                channelLabel: 'Seguimiento de creación',
            },
        ],
    },
    {
        id: 'ref-client-camila-02',
        fullName: 'Camila Valencia Ospina',
        greetingName: 'Camila',
        city: 'Medellín',
        stylePreference: 'Sastrería clásica femenina, hombros limpios y crepé estructurado.',
        defaultAccessStatus: 'invited',
        isLocalReference: true,
        creations: [
            {
                id: 'ref-creation-02a',
                clientId: 'ref-client-camila-02',
                name: 'Traje Sastre Crepé Marfil — Edición Medellín',
                occasion: 'Gala de Aniversario',
                garmentType: 'Sastrería Femenina',
                stageLabel: 'Primera prueba en glasilla',
                targetDate: '2027-01-24',
                collectionNote:
                    'Chaqueta entallada de solapa pico estilizada y pantalón palazzo de tiro alto.',
                sketches: [
                    {
                        id: 'sk-02a-1',
                        title: 'Lámina I — Chaqueta estructurada y caída palazzo',
                        silhouetteLabel: 'Solapa sastre estrecha · Cintura definida',
                        approvalStateLabel: 'En curaduría estética',
                        plateCode: 'BK-02A-I',
                    },
                ],
                fabrics: [
                    {
                        id: 'fab-02a-1',
                        aestheticName: 'Crepé sastre italiano de caída firme',
                        colorHarmony: 'Marfil Seda Cálido',
                        drapeFinish: 'Textura limpia resistente al arrugado de viaje',
                        editorialNote: 'Ideal para traslado aéreo hacia Medellín.',
                    },
                ],
                viewer3dSummary: {
                    isPrepared: false,
                    silhouetteTitle: 'Silueta Sastre Marfil',
                    stageLabel: 'Pendiente servicio 3D M09',
                    notice: 'Visualizador 3D conectado a backend pendiente de implementación M09.',
                },
            },
        ],
        quotes: [
            {
                id: 'qt-02a',
                clientId: 'ref-client-camila-02',
                creationId: 'ref-creation-02a',
                quoteCode: 'COT-2026-141',
                title: 'Propuesta Comercial — Traje Sastre Crepé Marfil',
                currency: 'USD',
                totalFormatted: 'USD $ 1.950',
                paymentPlanLabel: '50% anticipo · 50% al finalizar calce',
                status: 'sent',
                statusLabel: 'Enviada',
                issuedDate: '2026-11-16',
                validUntil: '2026-12-16',
            },
        ],
        appointments: [
            {
                id: 'apt-02-1',
                clientId: 'ref-client-camila-02',
                creationId: 'ref-creation-02a',
                title: 'Prueba inicial de hombros y caída de pantalón',
                dateBogota: '2026-12-03',
                timeRangeBogota: '14:00 – 15:00 (Hora Colombia)',
                spaceLabel: 'Atención Privada Virtual / Estudio Medellín',
                status: 'confirmed',
                statusLabel: 'Confirmada',
                clientVisible: true,
                preparationNote: 'Confirmar altura de tacón para marcar bastilla.',
            },
        ],
        fittingRounds: [
            {
                id: 'fit-02a-1',
                clientId: 'ref-client-camila-02',
                creationId: 'ref-creation-02a',
                creationName: 'Traje Sastre Crepé Marfil — Edición Medellín',
                roundNumber: 1,
                roundLabel: 'Ronda 1 · Glasilla Sastre',
                dateBogota: '2026-11-19',
                statusLabel: 'Resumen autorizado',
                clientSummary:
                    'Ajuste limpio de línea de hombro y holgura cómoda en cadera para pantalón palazzo.',
                summaryReady: true,
            },
        ],
        measurementSessions: [
            {
                id: 'meas-02-1',
                clientId: 'ref-client-camila-02',
                sessionDate: '2026-11-12',
                versionNumber: 1,
                unitSystem: 'cm',
                status: 'verified',
                statusLabel: 'Verificada por atelier',
            },
        ],
        messages: [
            {
                id: 'msg-02-1',
                clientId: 'ref-client-camila-02',
                creationId: null,
                authorLabel: 'Atelier By Katherine Carroll',
                dateBogota: '2026-11-19 · 09:30 BOG',
                subject: 'Confirmación de tu expediente privado de sastrería',
                body: 'Camila, compartimos en este espacio exclusivo tu agenda de prueba y los avances de tu traje sastre en crepé marfil según la configuración vigente.',
                channelLabel: 'Nota editorial autorizada',
            },
        ],
    },
    {
        id: 'ref-client-sofia-03',
        fullName: 'Sofía Arango Londoño',
        greetingName: 'Sofía',
        city: 'Cartagena',
        stylePreference: 'Cortes livianos de clima cálido, lino estructurado y caída orgánica.',
        defaultAccessStatus: 'unprovisioned',
        isLocalReference: true,
        creations: [
            {
                id: 'ref-creation-03a',
                clientId: 'ref-client-sofia-03',
                name: 'Vestido Gala Lino Noche',
                occasion: 'Recepción Frente al Mar',
                garmentType: 'Edición de Autor',
                stageLabel: 'Consulta inicial',
                targetDate: '2027-02-10',
                collectionNote: 'Escote limpio en espalda con tablones arquitectónicos suaves.',
                sketches: [
                    {
                        id: 'sk-03a-1',
                        title: 'Lámina I — Silueta fluida lino noche',
                        silhouetteLabel: 'Línea A ligera · Escote limpio',
                        approvalStateLabel: 'Borrado preliminar en estudio',
                        plateCode: 'BK-03A-I',
                    },
                ],
                fabrics: [
                    {
                        id: 'fab-03a-1',
                        aestheticName: 'Lino de alta torsión y gasa de seda',
                        colorHarmony: 'Arena Profundo',
                        drapeFinish: 'Frescura respirable con caída fluida',
                        editorialNote: 'Acabado pensado para clima costero.',
                    },
                ],
                viewer3dSummary: {
                    isPrepared: false,
                    silhouetteTitle: 'Silueta Lino Noche',
                    stageLabel: 'Pendiente servicio 3D M09',
                    notice: 'Visualizador 3D conectado a backend pendiente de implementación M09.',
                },
            },
        ],
        quotes: [
            {
                id: 'qt-03a',
                clientId: 'ref-client-sofia-03',
                creationId: 'ref-creation-03a',
                quoteCode: 'COT-2026-148',
                title: 'Propuesta Comercial — Vestido Gala Lino Noche',
                currency: 'COP',
                totalFormatted: '$ 7.400.000 COP',
                paymentPlanLabel: '50% inicio · 50% entrega en estudio',
                status: 'sent',
                statusLabel: 'Enviada',
                issuedDate: '2026-11-18',
                validUntil: '2026-12-18',
            },
        ],
        appointments: [
            {
                id: 'apt-03-1',
                clientId: 'ref-client-sofia-03',
                creationId: 'ref-creation-03a',
                title: 'Consulta estética inicial de silueta costera',
                dateBogota: '2026-12-12',
                timeRangeBogota: '11:00 – 12:00 (Hora Colombia)',
                spaceLabel: 'Atención Privada Virtual · Cartagena / Bogotá',
                status: 'scheduled',
                statusLabel: 'Programada',
                clientVisible: true,
                preparationNote: 'Tener referencias visuales de escote.',
            },
        ],
        fittingRounds: [
            {
                id: 'fit-03a-1',
                clientId: 'ref-client-sofia-03',
                creationId: 'ref-creation-03a',
                creationName: 'Vestido Gala Lino Noche',
                roundNumber: 1,
                roundLabel: 'Ronda 1 · Glasilla Preliminar',
                dateBogota: '2026-12-20',
                statusLabel: 'Resumen autorizado',
                clientSummary: 'Validación inicial de caída fresca en busto y cintura.',
                summaryReady: true,
            },
        ],
        measurementSessions: [
            {
                id: 'meas-03-1',
                clientId: 'ref-client-sofia-03',
                sessionDate: '2026-11-18',
                versionNumber: 1,
                unitSystem: 'cm',
                status: 'completed',
                statusLabel: 'Completada',
            },
        ],
        messages: [
            {
                id: 'msg-03-1',
                clientId: 'ref-client-sofia-03',
                creationId: null,
                authorLabel: 'Atelier By Katherine Carroll',
                dateBogota: '2026-11-19 · 10:15 BOG',
                subject: 'Bienvenida preliminar · Proyecto Lino Noche',
                body: 'Sofía, el equipo editorial organiza tu propuesta inicial pendiente de emitir enlace formal de acceso.',
                channelLabel: 'Nota editorial autorizada',
            },
        ],
    },
    {
        id: 'ref-client-isabela-04',
        fullName: 'Isabela Duarte Samper',
        greetingName: 'Isabela',
        city: 'Bogotá D. C.',
        stylePreference: 'Alta costura nocturna en satén duquesa y líneas esculpidas.',
        defaultAccessStatus: 'suspended',
        isLocalReference: true,
        creations: [
            {
                id: 'ref-creation-04a',
                clientId: 'ref-client-isabela-04',
                name: 'Conjunto Gala Satén Duquesa',
                occasion: 'Gala de Invierno',
                garmentType: 'Alta Costura Gala',
                stageLabel: 'Pausa administrativa',
                targetDate: null,
                collectionNote: 'Corsetería sastre suave con falda envolvente en satén duquesa.',
                sketches: [
                    {
                        id: 'sk-04a-1',
                        title: 'Lámina I — Conjunto gala en satén duquesa',
                        silhouetteLabel: 'Cintura esculpida · Pliegues arquitectónicos',
                        approvalStateLabel: 'En pausa administrativa',
                        plateCode: 'BK-04A-I',
                    },
                ],
                fabrics: [
                    {
                        id: 'fab-04a-1',
                        aestheticName: 'Satén duquesa de seda mate',
                        colorHarmony: 'Champagne Tostado',
                        drapeFinish: 'Cuerpo arquitectónico y brillo sereno',
                        editorialNote: 'Reservado en estudio mientras se reanuda agenda.',
                    },
                ],
                viewer3dSummary: {
                    isPrepared: false,
                    silhouetteTitle: 'Silueta Satén Duquesa',
                    stageLabel: 'Pendiente servicio 3D M09',
                    notice: 'Visualizador 3D conectado a backend pendiente de implementación M09.',
                },
            },
        ],
        quotes: [
            {
                id: 'qt-04a',
                clientId: 'ref-client-isabela-04',
                creationId: 'ref-creation-04a',
                quoteCode: 'COT-2026-108',
                title: 'Propuesta Comercial — Conjunto Gala Satén Duquesa',
                currency: 'COP',
                totalFormatted: '$ 9.800.000 COP',
                paymentPlanLabel: '50% inicio · 50% entrega final',
                status: 'sent',
                statusLabel: 'Enviada',
                issuedDate: '2026-10-25',
                validUntil: '2026-11-28',
            },
        ],
        appointments: [
            {
                id: 'apt-04-1',
                clientId: 'ref-client-isabela-04',
                creationId: 'ref-creation-04a',
                title: 'Revisión de reprogramación de calce',
                dateBogota: '2026-12-08',
                timeRangeBogota: '16:00 – 17:00 (Hora Colombia)',
                spaceLabel: 'Salón Privado Atelier · Zona G, Bogotá',
                status: 'scheduled',
                statusLabel: 'Programada',
                clientVisible: true,
                preparationNote: 'Confirmación sujeta a reactivación del portal.',
            },
        ],
        fittingRounds: [
            {
                id: 'fit-04a-1',
                clientId: 'ref-client-isabela-04',
                creationId: 'ref-creation-04a',
                creationName: 'Conjunto Gala Satén Duquesa',
                roundNumber: 1,
                roundLabel: 'Ronda 1 · Glasilla Base',
                dateBogota: '2026-11-02',
                statusLabel: 'Resumen autorizado',
                clientSummary: 'Entalle inicial validado antes de pausa temporal.',
                summaryReady: true,
            },
        ],
        measurementSessions: [
            {
                id: 'meas-04-1',
                clientId: 'ref-client-isabela-04',
                sessionDate: '2026-10-29',
                versionNumber: 1,
                unitSystem: 'cm',
                status: 'verified',
                statusLabel: 'Verificada por atelier',
            },
        ],
        messages: [
            {
                id: 'msg-04-1',
                clientId: 'ref-client-isabela-04',
                creationId: null,
                authorLabel: 'Atelier By Katherine Carroll',
                dateBogota: '2026-11-15 · 17:00 BOG',
                subject: 'Estado de pausa temporal del expediente',
                body: 'Isabela, tu expediente permanece resguardado en pausa temporal hasta nueva coordinación.',
                channelLabel: 'Nota editorial autorizada',
            },
        ],
    },
    {
        id: 'ref-client-lucia-05',
        fullName: 'Lucía Peñaranda Gómez',
        greetingName: 'Lucía',
        city: 'Cali',
        stylePreference: 'Archivo histórico finalizado.',
        defaultAccessStatus: 'revoked',
        isLocalReference: true,
        creations: [],
        quotes: [],
        appointments: [],
        fittingRounds: [],
        measurementSessions: [
            {
                id: 'meas-05-1',
                clientId: 'ref-client-lucia-05',
                sessionDate: '2026-09-14',
                versionNumber: 1,
                unitSystem: 'cm',
                status: 'completed',
                statusLabel: 'Completada',
            },
        ],
        messages: [],
    },
]);

export function createDefaultClientPermissions(): ClientPortalPermissionsState {
    return {
        globalGrants: {},
        creationGrants: {},
        creationQuoteOverrides: {},
    };
}

export function createCuratedDemoPermissions(clientId: string): ClientPortalPermissionsState {
    const record = CLIENT_PORTAL_REFERENCE_RECORDS.find((item) => item.id === clientId);
    if (!record) return createDefaultClientPermissions();

    const creationGrants: Record<string, Record<string, boolean>> = {};
    for (const cr of record.creations) {
        creationGrants[cr.id] = {
            [makeClientPermissionKey('creations', 'view')]: true,
            [makeClientPermissionKey('sketches', 'view')]: true,
            [makeClientPermissionKey('fabrics', 'view')]: true,
            [makeClientPermissionKey('fittings', 'view')]: true,
            [makeClientPermissionKey('3d_viewer', 'view')]: true,
        };
    }

    return {
        globalGrants: {
            [makeClientPermissionKey('appointments', 'view')]: true,
            [makeClientPermissionKey('measurements', 'view')]: true,
            [makeClientPermissionKey('quotations', 'view')]: true,
            [makeClientPermissionKey('messaging', 'observe')]: true,
            [makeClientPermissionKey('sketches', 'approve')]: true,
            [makeClientPermissionKey('sketches', 'download')]: true,
            [makeClientPermissionKey('quotations', 'download')]: true,
        },
        creationGrants,
        creationQuoteOverrides: {},
    };
}

export function createDenyOverrideDemoPermissions(
    clientId: string
): ClientPortalPermissionsState {
    const record = CLIENT_PORTAL_REFERENCE_RECORDS.find((item) => item.id === clientId);
    if (!record) return createDefaultClientPermissions();

    const creationGrants: Record<string, Record<string, boolean>> = {};
    const creationQuoteOverrides: Record<string, ClientQuoteOverrideMode> = {};

    record.creations.forEach((cr, index) => {
        creationGrants[cr.id] = {
            [makeClientPermissionKey('creations', 'view')]: true,
            [makeClientPermissionKey('sketches', 'view')]: true,
            [makeClientPermissionKey('fabrics', 'view')]: index === 0,
            [makeClientPermissionKey('fittings', 'view')]: true,
        };
        if (index === 0) {
            creationQuoteOverrides[cr.id] = 'deny';
        }
    });

    return {
        globalGrants: {
            [makeClientPermissionKey('appointments', 'view')]: true,
            [makeClientPermissionKey('measurements', 'view')]: true,
            [makeClientPermissionKey('quotations', 'view')]: true,
            [makeClientPermissionKey('messaging', 'observe')]: true,
        },
        creationGrants,
        creationQuoteOverrides,
    };
}

export function toggleGlobalClientPermission(
    state: ClientPortalPermissionsState,
    resource: PortalResource,
    action: PortalAction
): ClientPortalPermissionsState {
    if (!isCanonicalClientPermission(resource, action)) return state;
    if (action === 'view' && CREATION_SCOPED_ONLY_VIEW_RESOURCES.includes(resource)) {
        return state;
    }

    const key = makeClientPermissionKey(resource, action);
    const nextGlobal = { ...state.globalGrants };
    if (nextGlobal[key]) {
        delete nextGlobal[key];
    } else {
        nextGlobal[key] = true;
    }
    return {
        ...state,
        globalGrants: nextGlobal,
    };
}

export function toggleCreationClientPermission(
    state: ClientPortalPermissionsState,
    creationId: string,
    resource: PortalResource,
    action: PortalAction
): ClientPortalPermissionsState {
    if (!creationId || !isCanonicalClientPermission(resource, action)) return state;

    const key = makeClientPermissionKey(resource, action);
    const currentCreation = state.creationGrants[creationId] || {};
    const masterVisible = Boolean(currentCreation[makeClientPermissionKey('creations', 'view')]);

    // Doble Candado: apagar creations:view limpia todos los subpermisos de esa creación
    if (resource === 'creations' && action === 'view') {
        if (masterVisible) {
            const nextCreations = { ...state.creationGrants };
            delete nextCreations[creationId];
            const nextOverrides = { ...state.creationQuoteOverrides };
            delete nextOverrides[creationId];
            return {
                ...state,
                creationGrants: nextCreations,
                creationQuoteOverrides: nextOverrides,
            };
        }
        return {
            ...state,
            creationGrants: {
                ...state.creationGrants,
                [creationId]: {
                    ...currentCreation,
                    [key]: true,
                },
            },
        };
    }

    if (!masterVisible) {
        return state;
    }

    const nextForCreation = { ...currentCreation };
    if (nextForCreation[key]) {
        delete nextForCreation[key];
    } else {
        nextForCreation[key] = true;
    }
    return {
        ...state,
        creationGrants: {
            ...state.creationGrants,
            [creationId]: nextForCreation,
        },
    };
}

export function setCreationClientQuoteOverride(
    state: ClientPortalPermissionsState,
    creationId: string,
    mode: ClientQuoteOverrideMode
): ClientPortalPermissionsState {
    if (!creationId) return state;
    const nextOverrides = { ...state.creationQuoteOverrides };
    if (mode === 'inherit') {
        delete nextOverrides[creationId];
    } else {
        nextOverrides[creationId] = mode;
    }
    return {
        ...state,
        creationQuoteOverrides: nextOverrides,
    };
}

export function evaluateClientPortalPermission(params: {
    accessStatus: ClientPortalLifecycleStatus;
    permissions: ClientPortalPermissionsState;
    resource: PortalResource;
    action: PortalAction;
    creationId?: string | null;
}): ClientPermissionEvaluation {
    const { accessStatus, permissions, resource, action, creationId = null } = params;
    const key = makeClientPermissionKey(resource, action);

    if (accessStatus !== 'active') {
        return { allowed: false, reason: 'blocked_by_access_status' };
    }

    if (creationId === null) {
        if (action === 'view' && CREATION_SCOPED_ONLY_VIEW_RESOURCES.includes(resource)) {
            return { allowed: false, reason: 'blocked_global_scope_forbidden' };
        }
        return permissions.globalGrants[key]
            ? { allowed: true, reason: 'allowed' }
            : { allowed: false, reason: 'disabled_zero_trust' };
    }

    const creationMap = permissions.creationGrants[creationId] || {};
    const masterVisible = Boolean(creationMap[makeClientPermissionKey('creations', 'view')]);

    // Precedencia estricta deny-overrides para cotizaciones por creación
    if (resource === 'quotations' && action === 'view') {
        const override = permissions.creationQuoteOverrides[creationId] || 'inherit';
        if (override === 'deny') {
            return { allowed: false, reason: 'denied_by_override' };
        }
        if (!masterVisible) {
            return { allowed: false, reason: 'blocked_by_double_lock' };
        }
        if (override === 'allow') {
            return { allowed: true, reason: 'allowed' };
        }
        return permissions.globalGrants[key]
            ? { allowed: true, reason: 'allowed' }
            : { allowed: false, reason: 'disabled_zero_trust' };
    }

    if (resource === 'creations' && action === 'view') {
        return masterVisible
            ? { allowed: true, reason: 'allowed' }
            : { allowed: false, reason: 'disabled_zero_trust' };
    }

    if (!masterVisible) {
        return { allowed: false, reason: 'blocked_by_double_lock' };
    }

    if (action !== 'view') {
        const granted = Boolean(creationMap[key]) || Boolean(permissions.globalGrants[key]);
        return granted
            ? { allowed: true, reason: 'allowed' }
            : { allowed: false, reason: 'disabled_zero_trust' };
    }

    return creationMap[key]
        ? { allowed: true, reason: 'allowed' }
        : { allowed: false, reason: 'disabled_zero_trust' };
}

function countConfiguredPermissionEntries(permissions: ClientPortalPermissionsState): number {
    let total = Object.values(permissions.globalGrants).filter(Boolean).length;
    for (const crMap of Object.values(permissions.creationGrants)) {
        total += Object.values(crMap).filter(Boolean).length;
    }
    for (const mode of Object.values(permissions.creationQuoteOverrides)) {
        if (mode !== 'inherit') total += 1;
    }
    return total;
}

export function projectAuthorizedClientPortalView(params: {
    clientId: string;
    accessStatus: ClientPortalLifecycleStatus;
    permissions: ClientPortalPermissionsState;
}): ClientPortalAuthorizedView {
    const { clientId, accessStatus, permissions } = params;
    const client = CLIENT_PORTAL_REFERENCE_RECORDS.find((item) => item.id === clientId) || null;
    const enabledPermissionCount = countConfiguredPermissionEntries(permissions);

    if (!client || accessStatus !== 'active') {
        return {
            client,
            accessStatus,
            isAccessible: false,
            enabledPermissionCount,
            authorizedSectionCount: 0,
            isZeroTrustEmpty: true,
            authorizedCreations: [],
            authorizedQuotes: [],
            authorizedAppointments: [],
            authorizedFittings: [],
            authorizedMeasurementSessions: [],
            authorizedMessages: [],
            canViewAppointments: false,
            canViewMeasurements: false,
            canViewGlobalQuotes: false,
            canObserveMessaging: false,
            canApproveSketchesAction: false,
            canDownloadSketchesAction: false,
            canDownloadQuotesAction: false,
        };
    }

    // Aislamiento estricto por clientId antes de evaluar permisos individuales
    const ownCreations = client.creations.filter((c) => c.clientId === client.id);
    const ownQuotes = client.quotes.filter((q) => q.clientId === client.id);
    const ownAppointments = client.appointments.filter(
        (a) => a.clientId === client.id && a.clientVisible === true
    );
    const ownFittings = client.fittingRounds.filter(
        (f) => f.clientId === client.id && f.summaryReady === true
    );
    const ownMeasurements = client.measurementSessions.filter(
        (m) => m.clientId === client.id && (m.status === 'verified' || m.status === 'completed')
    );
    const ownMessages = client.messages.filter((msg) => msg.clientId === client.id);

    const authorizedCreations: AuthorizedCreationProjection[] = [];
    const authorizedQuotes: ClientSafeQuote[] = [];
    const visibleCreationIds = new Set<string>();

    for (const cr of ownCreations) {
        const masterEval = evaluateClientPortalPermission({
            accessStatus,
            permissions,
            resource: 'creations',
            action: 'view',
            creationId: cr.id,
        });
        if (!masterEval.allowed) {
            continue;
        }

        visibleCreationIds.add(cr.id);

        const canViewSketches = evaluateClientPortalPermission({
            accessStatus,
            permissions,
            resource: 'sketches',
            action: 'view',
            creationId: cr.id,
        }).allowed;

        const canViewFabrics = evaluateClientPortalPermission({
            accessStatus,
            permissions,
            resource: 'fabrics',
            action: 'view',
            creationId: cr.id,
        }).allowed;

        const canViewFittings = evaluateClientPortalPermission({
            accessStatus,
            permissions,
            resource: 'fittings',
            action: 'view',
            creationId: cr.id,
        }).allowed;

        const canView3dViewer = evaluateClientPortalPermission({
            accessStatus,
            permissions,
            resource: '3d_viewer',
            action: 'view',
            creationId: cr.id,
        }).allowed;

        const quoteEval = evaluateClientPortalPermission({
            accessStatus,
            permissions,
            resource: 'quotations',
            action: 'view',
            creationId: cr.id,
        });

        const matchingQuote = quoteEval.allowed
            ? ownQuotes.find((q) => q.creationId === cr.id) || null
            : null;
        if (matchingQuote) {
            authorizedQuotes.push(matchingQuote);
        }

        const canApproveSketches =
            canViewSketches &&
            evaluateClientPortalPermission({
                accessStatus,
                permissions,
                resource: 'sketches',
                action: 'approve',
                creationId: cr.id,
            }).allowed;

        const canDownloadSketches =
            canViewSketches &&
            evaluateClientPortalPermission({
                accessStatus,
                permissions,
                resource: 'sketches',
                action: 'download',
                creationId: cr.id,
            }).allowed;

        const canDownloadQuote =
            quoteEval.allowed &&
            Boolean(matchingQuote) &&
            evaluateClientPortalPermission({
                accessStatus,
                permissions,
                resource: 'quotations',
                action: 'download',
                creationId: cr.id,
            }).allowed;

        authorizedCreations.push({
            creation: cr,
            canViewSketches,
            canViewFabrics,
            canViewFittings,
            canView3dViewer,
            canViewQuote: quoteEval.allowed,
            quoteBlockedByDenyOverride: quoteEval.reason === 'denied_by_override',
            quote: matchingQuote,
            canApproveSketches,
            canDownloadSketches,
            canDownloadQuote,
        });
    }

    const canViewAppointments = evaluateClientPortalPermission({
        accessStatus,
        permissions,
        resource: 'appointments',
        action: 'view',
        creationId: null,
    }).allowed;

    const canViewMeasurements = evaluateClientPortalPermission({
        accessStatus,
        permissions,
        resource: 'measurements',
        action: 'view',
        creationId: null,
    }).allowed;

    const canViewGlobalQuotes = evaluateClientPortalPermission({
        accessStatus,
        permissions,
        resource: 'quotations',
        action: 'view',
        creationId: null,
    }).allowed;

    const canObserveMessaging = evaluateClientPortalPermission({
        accessStatus,
        permissions,
        resource: 'messaging',
        action: 'observe',
        creationId: null,
    }).allowed;

    const canApproveSketchesAction = evaluateClientPortalPermission({
        accessStatus,
        permissions,
        resource: 'sketches',
        action: 'approve',
        creationId: null,
    }).allowed;

    const canDownloadSketchesAction = evaluateClientPortalPermission({
        accessStatus,
        permissions,
        resource: 'sketches',
        action: 'download',
        creationId: null,
    }).allowed;

    const canDownloadQuotesAction = evaluateClientPortalPermission({
        accessStatus,
        permissions,
        resource: 'quotations',
        action: 'download',
        creationId: null,
    }).allowed;

    const authorizedAppointments = canViewAppointments ? ownAppointments : [];

    // Doble Candado M06: requiere creación visible Y permiso fittings:view por creación
    const authorizedFittings = ownFittings.filter((fit) => {
        if (!visibleCreationIds.has(fit.creationId)) return false;
        return evaluateClientPortalPermission({
            accessStatus,
            permissions,
            resource: 'fittings',
            action: 'view',
            creationId: fit.creationId,
        }).allowed;
    });

    const authorizedMeasurementSessions = canViewMeasurements ? ownMeasurements : [];

    // Mensajes vinculados a creación respetan Doble Candado; mensajes generales solo messaging:observe
    const authorizedMessages = canObserveMessaging
        ? ownMessages.filter((msg) => !msg.creationId || visibleCreationIds.has(msg.creationId))
        : [];

    let authorizedSectionCount = 0;
    if (authorizedCreations.length > 0) authorizedSectionCount += 1;
    if (canViewAppointments) authorizedSectionCount += 1;
    if (authorizedFittings.length > 0 || canViewMeasurements) authorizedSectionCount += 1;
    if (canObserveMessaging) authorizedSectionCount += 1;

    return {
        client,
        accessStatus,
        isAccessible: true,
        enabledPermissionCount,
        authorizedSectionCount,
        isZeroTrustEmpty: enabledPermissionCount === 0,
        authorizedCreations,
        authorizedQuotes,
        authorizedAppointments,
        authorizedFittings,
        authorizedMeasurementSessions,
        authorizedMessages,
        canViewAppointments,
        canViewMeasurements,
        canViewGlobalQuotes,
        canObserveMessaging,
        canApproveSketchesAction,
        canDownloadSketchesAction,
        canDownloadQuotesAction,
    };
}
