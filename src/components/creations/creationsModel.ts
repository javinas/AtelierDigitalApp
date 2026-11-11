// ==============================================================================
// ATELIER DIGITAL — MODELO DE DOMINIO: CREACIONES DE ALTA COSTURA
// Archivo: src/components/creations/creationsModel.ts
// ==============================================================================

import { Creation, CreationStatus, CreationType } from '../../types/creation';

export type CreationDetailTab =
    | 'resumen'
    | 'concepto'
    | 'medidas'
    | 'patronaje'
    | 'fitting'
    | 'materiales'
    | 'cotizaciones'
    | 'confeccion'
    | 'finanzas'
    | 'bitacora';

export const GARMENT_TYPE_LABELS: Record<string, string> = {
    bodice: 'Corpiño Base de Alta Costura',
    sleeve: 'Manga Sastre Enlazada',
    skirt: 'Falda Base y Línea A',
    pants: 'Pantalón Sastre Femenino',
    dress: 'Vestido Atelier Compuesto',
    blouse: 'Blusa Fluida Derivada',
    shirt: 'Camisa Clásica de Atelier',
    corset: 'Corsé Estructurado de Alta Costura',
    jacket: 'Chaqueta Sastre de Alta Costura',
    coat: 'Abrigo Sastre Estructurado',
};

// Fotografías Editoriales de Alta Costura alusivas a la Creación
export const CREATION_EDITORIAL_IMAGES: Record<string, any> = {
    jacket: require('../../../assets/garments/jacket.jpg'),
    bodice: require('../../../assets/garments/bodice.jpg'),
    dress: require('../../../assets/garments/dress.jpg'),
    coat: require('../../../assets/garments/coat.jpg'),
    corset: require('../../../assets/garments/corset.jpg'),
    skirt: require('../../../assets/garments/skirt.jpg'),
    pants: require('../../../assets/garments/pants.jpg'),
    blouse: require('../../../assets/garments/blouse.jpg'),
    shirt: require('../../../assets/garments/shirt.jpg'),
    sleeve: require('../../../assets/garments/sleeve.jpg'),
};

export const DEFAULT_CREATION_IMAGE = require('../../../assets/cards/card_creations.jpg');

export function getCreationPhoto(c?: Creation | null): any {
    if (!c) return DEFAULT_CREATION_IMAGE;
    if ((c as any).photo_url && typeof (c as any).photo_url === 'string') {
        return { uri: (c as any).photo_url };
    }
    const garmentKey = (c.active_pattern?.garment_type || c.garment_type || 'jacket').toLowerCase();
    return CREATION_EDITORIAL_IMAGES[garmentKey] || CREATION_EDITORIAL_IMAGES.jacket || DEFAULT_CREATION_IMAGE;
}

export interface CreationStage {
    id: string;
    label: string;
    status: 'completed' | 'current' | 'pending' | 'cancelled';
}

export function getCreationStages(c: Creation): CreationStage[] {
    const isCancelled = c.status === 'cancelled';
    if (isCancelled) {
        return [
            { id: 'concept', label: 'Concepto', status: 'completed' },
            { id: 'measures', label: 'Medidas', status: c.session_id ? 'completed' : 'pending' },
            { id: 'pattern', label: 'Patronaje', status: c.active_pattern_execution_id ? 'completed' : 'pending' },
            { id: 'fitting', label: 'Fitting', status: 'pending' },
            { id: 'approval', label: 'Aprobación', status: 'pending' },
            { id: 'production', label: 'Confección', status: 'pending' },
            { id: 'completed', label: 'Cancelada', status: 'cancelled' },
        ];
    }

    const hasSession = Boolean(c.session_id);
    const hasPattern = Boolean(c.active_pattern_execution_id || c.active_pattern);

    // 1. Concepto
    const conceptStatus: 'completed' | 'current' = c.status === 'draft' ? 'current' : 'completed';

    // 2. Medidas
    let measuresStatus: 'completed' | 'current' | 'pending' = 'pending';
    if (hasSession) {
        measuresStatus = 'completed';
    } else if (c.status === 'active' || c.status === 'draft') {
        measuresStatus = 'current';
    }

    // 3. Patronaje
    let patternStatus: 'completed' | 'current' | 'pending' = 'pending';
    if (hasPattern) {
        patternStatus = 'completed';
    } else if (c.status === 'active' && hasSession) {
        patternStatus = 'current';
    }

    // 4. Fitting
    let fittingStatus: 'completed' | 'current' | 'pending' = 'pending';
    if (['approved', 'production', 'completed'].includes(c.status)) {
        fittingStatus = 'completed';
    } else if (c.status === 'fitting') {
        fittingStatus = 'current';
    }

    // 5. Aprobación
    let approvalStatus: 'completed' | 'current' | 'pending' = 'pending';
    if (['approved', 'production', 'completed'].includes(c.status)) {
        approvalStatus = 'completed';
    } else if (c.status === 'fitting' && hasPattern) {
        approvalStatus = 'pending';
    }

    // 6. Confección
    let productionStatus: 'completed' | 'current' | 'pending' = 'pending';
    if (c.status === 'completed') {
        productionStatus = 'completed';
    } else if (c.status === 'production') {
        productionStatus = 'current';
    }

    // 7. Finalizada
    let completedStatus: 'completed' | 'current' | 'pending' = 'pending';
    if (c.status === 'completed') {
        completedStatus = 'completed';
    }

    return [
        { id: 'concept', label: 'Concepto', status: conceptStatus },
        { id: 'measures', label: 'Medidas', status: measuresStatus },
        { id: 'pattern', label: 'Patronaje', status: patternStatus },
        { id: 'fitting', label: 'Fitting', status: fittingStatus },
        { id: 'approval', label: 'Aprobación', status: approvalStatus },
        { id: 'production', label: 'Confección', status: productionStatus },
        { id: 'completed', label: 'Finalizada', status: completedStatus },
    ];
}

export const STATUS_LABELS: Record<CreationStatus, { label: string; bg: string; color: string; border: string }> = {
    draft: { label: 'Borrador', bg: '#F5F3EF', color: '#766B62', border: '#E6D9C8' },
    active: { label: 'Activa', bg: '#F8F2E9', color: '#8A6A4A', border: '#A78350' },
    fitting: { label: 'En Fitting', bg: '#FFF8E7', color: '#B37D14', border: '#F2D48E' },
    approved: { label: 'Aprobada', bg: '#F1F7F2', color: '#3D6346', border: '#C2DFCA' },
    production: { label: 'En Confección', bg: '#EBF3FB', color: '#2C5E8A', border: '#B8D5E5' },
    completed: { label: 'Finalizada', bg: '#EFEFEF', color: '#171411', border: '#CCCCCC' },
    cancelled: { label: 'Cancelada', bg: '#FAF2F2', color: '#9E3B3B', border: '#E8C5C5' },
};

export const TYPE_LABELS: Record<CreationType, string> = {
    bespoke: 'A Medida (Bespoke)',
    pret_a_couture: 'Prêt-à-Couture',
    couture_collection: 'Colección de Alta Costura',
    bridal: 'Novia (Bridal)',
    gala: 'Gala & Fiesta',
    corporate: 'Sastrería Corporativa',
    fantasy: 'Vestuario & Fantasía',
    alteration: 'Restauración & Transformación',
};

// ==============================================================================
// CLIENTAS Y CREACIONES DE DEMOSTRACIÓN DE ALTA COSTURA
// ==============================================================================
export const SAMPLE_CLIENTS = [
    {
        id: 'client-001',
        full_name: 'Valentina Restrepo Henao',
        email: 'valentina.restrepo@atelierdigital.test',
        phone: '+57 310 987 6543',
        city: 'Medellín',
        status: 'active',
        created_at: '2026-10-15T10:00:00Z',
    },
    {
        id: 'client-002',
        full_name: 'Camila Echeverry Gómez',
        email: 'camila.echeverry@atelierdigital.test',
        phone: '+57 312 456 7890',
        city: 'Bogotá',
        status: 'active',
        created_at: '2026-10-18T14:30:00Z',
    },
    {
        id: 'client-003',
        full_name: 'Sofía Londoño Morales',
        email: 'sofia.londono@atelierdigital.test',
        phone: '+57 315 222 3344',
        city: 'Barranquilla',
        status: 'active',
        created_at: '2026-10-20T09:15:00Z',
    },
];

export const SAMPLE_CREATIONS: Creation[] = [
    {
        id: 'cr-sample-001',
        client_id: 'client-001',
        name: 'Vestido de Gala en Seda Salvaje & Mikado',
        description: 'Diseño exclusivo de alta costura para gala anual. Corpiño estructurado con escote corazón velado en tul ilusión, falda de línea A con cola catedral y drapeado asimétrico a mano.',
        creation_type: 'gala',
        occasion: 'Gala Anual Filarmónica de Medellín',
        target_date: '2026-12-15',
        status: 'production',
        notes: 'Prenda protagonista de temporada. Ajuste milimétrico con doble hilván y varillas de corsetería alemanas.',
        garment_type: 'dress',
        session_id: 'session-sample-001',
        active_pattern_execution_id: 'pat-exec-001',
        total_executions_count: 3,
        created_at: '2026-10-22T11:00:00Z',
        updated_at: '2026-11-08T09:30:00Z',
        client: SAMPLE_CLIENTS[0] as any,
    },
    {
        id: 'cr-sample-002',
        client_id: 'client-002',
        name: 'Vestido Nupcial en Encaje Francés Chantilly',
        description: 'Vestido de novia de alta costura con corsé interior entallado, mangas desmontables en encaje de aguja, botonadura forrada en seda y forro en satén duquesa.',
        creation_type: 'bridal',
        occasion: 'Ceremonia Nupcial en Villa de Leyva',
        target_date: '2026-11-28',
        status: 'fitting',
        notes: 'Fitting 1 con glasilla superado con felicitaciones. En proceso de montaje del encaje sobre base de tul.',
        garment_type: 'corset',
        session_id: 'session-sample-002',
        active_pattern_execution_id: 'pat-exec-002',
        total_executions_count: 2,
        created_at: '2026-10-25T15:20:00Z',
        updated_at: '2026-11-07T16:45:00Z',
        client: SAMPLE_CLIENTS[1] as any,
    },
    {
        id: 'cr-sample-003',
        client_id: 'client-003',
        name: 'Chaqueta Sastre Estructurada Marfil',
        description: 'Sastrería femenina de alta costura confeccionada en lana fría y solapa smoking en raso de seda. Hombreras artesanales y botones de asta grabados.',
        creation_type: 'bespoke',
        occasion: 'Apertura Bienal de Arte & Diseño',
        target_date: '2026-12-05',
        status: 'approved',
        notes: 'Patrón CAD calibrado y aprobado con holgura de 4 cm en contorno de busto.',
        garment_type: 'jacket',
        session_id: 'session-sample-003',
        active_pattern_execution_id: 'pat-exec-003',
        total_executions_count: 4,
        created_at: '2026-10-28T08:40:00Z',
        updated_at: '2026-11-06T12:10:00Z',
        client: SAMPLE_CLIENTS[2] as any,
    },
];

