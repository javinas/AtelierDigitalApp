// ==============================================================================
// ATELIER DIGITAL — RUTA DISEÑADORA: INVITACIONES DEL PORTAL (M09)
// Archivo: app/(designer)/client-portal-invitations.tsx
// ==============================================================================

import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { DesignerPortalInvitationsScreen } from '../../src/components/portalInvitations';
import { useAuth } from '../../src/context/AuthContext';

export default function DesignerClientPortalInvitationsRoute() {
    const { role } = useAuth();
    const params = useLocalSearchParams<{ client_id?: string | string[] }>();
    const rawClientId = Array.isArray(params.client_id) ? params.client_id[0] : params.client_id;

    return (
        <DesignerPortalInvitationsScreen
            initialClientId={rawClientId}
            onBack={() => router.replace(role === 'admin' ? '/(admin)' : '/(designer)')}
            onOpenPermissions={(clientId) =>
                router.push(`/(designer)/client-portal?client_id=${encodeURIComponent(clientId)}`)
            }
        />
    );
}
