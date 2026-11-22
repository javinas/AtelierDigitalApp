// ==============================================================================
// ATELIER DIGITAL — PANTALLA: GESTIÓN DEL PORTAL DE CLIENTES (M09)
// Archivo: app/(designer)/client-portal.tsx
// ==============================================================================

import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { PortalDesignerStudioScreen } from '../../src/components/portal';
import { useAuth } from '../../src/context/AuthContext';

export default function DesignerClientPortalRoute() {
    const { role } = useAuth();
    const params = useLocalSearchParams<{ client_id?: string | string[] }>();
    const rawClientId = Array.isArray(params.client_id) ? params.client_id[0] : params.client_id;

    return (
        <PortalDesignerStudioScreen
            initialClientId={rawClientId}
            onBack={() => router.replace(role === 'admin' ? '/(admin)' : '/(designer)')}
        />
    );
}
