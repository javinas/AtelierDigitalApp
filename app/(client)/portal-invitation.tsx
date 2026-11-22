// ==============================================================================
// ATELIER DIGITAL — RUTA CLIENTA: ACEPTACIÓN LOCAL DE INVITACIÓN (M09)
// Archivo: app/(client)/portal-invitation.tsx
// ==============================================================================

import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ClientPortalInvitationScreen } from '../../src/components/portalInvitations';

export default function ClientPortalInvitationRoute() {
    const params = useLocalSearchParams<{ client_id?: string | string[] }>();
    const rawClientId = Array.isArray(params.client_id) ? params.client_id[0] : params.client_id;

    return (
        <ClientPortalInvitationScreen
            initialTargetClientId={rawClientId}
            onBack={() => router.replace('/(client)')}
            onOpenPortal={() => router.replace('/(client)/mi-portal')}
        />
    );
}
