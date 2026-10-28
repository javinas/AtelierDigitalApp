// ==============================================================================
// ATELIER DIGITAL — UTILIDAD: AVATARES EDITORIALES REALISTAS DE CLIENTAS
// Archivo: src/utils/clientAvatarHelper.ts
// ==============================================================================
// Colección de retratos fotográficos de alta costura seleccionados
// determinísticamente para clientas sin fotografía propia, asegurando una
// experiencia editorial refinada sin iconos genéricos ni siluetas.
// ==============================================================================

import { ImageSourcePropType } from 'react-native';

export const EDITORIAL_AVATARS: { id: string; source: ImageSourcePropType; label: string }[] = [
    {
        id: 'avatar_01',
        source: require('../../assets/avatars/avatar_editorial_01.jpg'),
        label: 'Retrato Editorial Atelier 01',
    },
    {
        id: 'avatar_02',
        source: require('../../assets/avatars/avatar_editorial_02.jpg'),
        label: 'Retrato Editorial Atelier 02',
    },
    {
        id: 'avatar_03',
        source: require('../../assets/avatars/avatar_editorial_03.jpg'),
        label: 'Retrato Editorial Atelier 03',
    },
    {
        id: 'avatar_04',
        source: require('../../assets/avatars/avatar_editorial_04.jpg'),
        label: 'Retrato Editorial Atelier 04',
    },
    {
        id: 'avatar_05',
        source: require('../../assets/avatars/avatar_editorial_05.jpg'),
        label: 'Retrato Editorial Atelier 05',
    },
    {
        id: 'avatar_06',
        source: require('../../assets/avatars/avatar_editorial_06.jpg'),
        label: 'Retrato Editorial Atelier 06',
    },
];

export const CLIENTS_EMPTY_STATE_IMAGE = require('../../assets/clients/clients_empty_state.jpg');

/**
 * Calcula un índice determinístico estable a partir del ID o nombre de la clienta.
 */
export function getDeterministicAvatarIndex(seed: string | null | undefined): number {
    if (!seed || seed.trim().length === 0) return 0;
    let hash = 0;
    const cleanSeed = seed.trim();
    for (let i = 0; i < cleanSeed.length; i++) {
        hash = ((hash << 5) - hash) + cleanSeed.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash) % EDITORIAL_AVATARS.length;
}

/**
 * Retorna la fuente de imagen para el avatar editorial de una clienta.
 */
export function getEditorialAvatarSource(seed: string | null | undefined): ImageSourcePropType {
    const index = getDeterministicAvatarIndex(seed);
    return EDITORIAL_AVATARS[index].source;
}

/**
 * Obtiene las iniciales en mayúscula del nombre de la clienta.
 */
export function getClientInitials(fullName: string | null | undefined): string {
    if (!fullName || fullName.trim().length === 0) return 'AD';
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'AD';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
