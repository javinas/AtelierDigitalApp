// ==============================================================================
// ATELIER DIGITAL — RUTA: PORTAL DE LA CLIENTA (M09)
// Archivo: app/(client)/mi-portal.tsx
// ==============================================================================

import React from 'react';
import { router } from 'expo-router';
import { ClientPortalExperienceScreen } from '../../src/components/clientPortal';

export default function ClientPortalExperienceRoute() {
    return (
        <ClientPortalExperienceScreen
            onBack={() => router.replace('/(client)')}
        />
    );
}
