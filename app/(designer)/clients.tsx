// ==============================================================================
// ATELIER DIGITAL — PANTALLA: DIRECTORIO DE CLIENTES (DISEÑADORA)
// Archivo: app/(designer)/clients.tsx
// ==============================================================================

import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { ClientsModule } from '../../src/components/clients/ClientsModule';

export default function DesignerClientsScreen() {
    const params = useLocalSearchParams<{ client_id?: string }>();

    return (
        <ClientsModule
            onBack={() => router.replace('/(designer)')}
            titleBack="← Volver al Atelier Diseñadora"
            initialDossierClientId={params.client_id || null}
        />
    );
}
