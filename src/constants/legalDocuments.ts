// ==============================================================================
// ATELIER DIGITAL · BY KATHERINE CARROLL
// CONSTANTES DE VERSIONAMIENTO LEGAL, METADATOS NORMATIVOS Y PLACEHOLDERS
// ==============================================================================

export const LEGAL_DOCUMENT_VERSIONS = {
    TERMS_OF_SERVICE: '1.0',
    PRIVACY_POLICY: '1.0',
    PRIVACY_NOTICE: '1.0',
    COOKIES_POLICY: '1.0',
    AI_TRANSPARENCY: '1.0',
    AGE_CONFIRMATION: '1.0',
    MARKETING_OPT_IN: '1.0',
} as const;

export const LEGAL_EFFECTIVE_DATE = '28 de octubre de 2026';
export const LEGAL_LAST_UPDATED = '28 de octubre de 2026';

/**
 * Información del Responsable del Tratamiento y Titular de la Plataforma.
 * NOTA: Los campos entre corchetes son placeholders explícitos que deben ser
 * completados con los datos mercantiles y tributarios definitivos antes de
 * la publicación comercial final, previa validación jurídica profesional.
 */
export const LEGAL_ENTITY_INFO = {
    brandName: 'Atelier Digital · By Katherine Carroll',
    commercialName: 'By Katherine Carroll · Atelier de Autor',
    creativeDirector: 'Katherine Carroll',
    legalNamePlaceholder: '[PENDIENTE DE COMPLETAR: Razón Social o Nombre Completo del Titular Legal]',
    taxIdPlaceholder: '[PENDIENTE DE COMPLETAR: NIT / Número de Identificación Tributaria]',
    addressPlaceholder: '[PENDIENTE DE COMPLETAR: Dirección física de notificaciones en Barranquilla]',
    cityCountry: 'Barranquilla, Atlántico · República de Colombia',
    contactEmailPlaceholder: '[PENDIENTE DE COMPLETAR: Correo oficial para protección de datos, ej. privacidad@bykatherinecarroll.com]',
    phonePlaceholder: '[PENDIENTE DE COMPLETAR: Línea telefónica / WhatsApp oficial de atención al titular]',
    instagramOfficial: '@carrollkatherine',
    contactRoute: '/contacto',
} as const;

export type LegalRouteKey =
    | 'terminos-condiciones'
    | 'politica-privacidad'
    | 'aviso-privacidad'
    | 'politica-cookies'
    | 'ia-transparencia';

export interface LegalNavDocument {
    key: LegalRouteKey;
    title: string;
    shortTitle: string;
    route: `/${LegalRouteKey}`;
    version: string;
}

export const LEGAL_DOCUMENTS_NAV: LegalNavDocument[] = [
    {
        key: 'terminos-condiciones',
        title: 'Términos y Condiciones de Uso',
        shortTitle: 'Términos y Condiciones',
        route: '/terminos-condiciones',
        version: LEGAL_DOCUMENT_VERSIONS.TERMS_OF_SERVICE,
    },
    {
        key: 'politica-privacidad',
        title: 'Política de Tratamiento de Datos Personales',
        shortTitle: 'Política de Privacidad',
        route: '/politica-privacidad',
        version: LEGAL_DOCUMENT_VERSIONS.PRIVACY_POLICY,
    },
    {
        key: 'aviso-privacidad',
        title: 'Aviso de Privacidad',
        shortTitle: 'Aviso de Privacidad',
        route: '/aviso-privacidad',
        version: LEGAL_DOCUMENT_VERSIONS.PRIVACY_NOTICE,
    },
    {
        key: 'politica-cookies',
        title: 'Política de Cookies y Almacenamiento Local',
        shortTitle: 'Política de Cookies',
        route: '/politica-cookies',
        version: LEGAL_DOCUMENT_VERSIONS.COOKIES_POLICY,
    },
    {
        key: 'ia-transparencia',
        title: 'Política de Transparencia en Inteligencia Artificial',
        shortTitle: 'Transparencia IA',
        route: '/ia-transparencia',
        version: LEGAL_DOCUMENT_VERSIONS.AI_TRANSPARENCY,
    },
];

