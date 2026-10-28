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
 * Información oficial del Responsable del Tratamiento y Titular de la Plataforma.
 */
export const LEGAL_ENTITY_INFO = {
    brandName: 'Atelier Digital · By Katherine Carroll',
    commercialName: 'By Katherine Carroll · Atelier de Autor',
    creativeDirector: 'Katherine Carroll Torrenegra',
    legalNamePlaceholder: 'Katherine Carroll Torrenegra',
    taxIdPlaceholder:
        'Registro Mercantil / RUT vigente en Colombia (información tributaria disponible para titulares y autoridades a través del canal oficial)',
    addressPlaceholder:
        'Villa Carolina, Barranquilla, Atlántico · Colombia (Atención personalizada previa cita)',
    cityCountry: 'Barranquilla, Atlántico · República de Colombia',
    contactEmailPlaceholder: 'info@bykatherinecarroll.com',
    phonePlaceholder: '+57 305 243 0400',
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

