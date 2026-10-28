// ==============================================================================
// ATELIER DIGITAL — PANTALLA: CREACIONES DE ALTA COSTURA (DISEÑADORA)
// Archivo: app/(designer)/creations.tsx
// ==============================================================================

import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { CreationsModule } from '../../src/components/creations/CreationsModule';

export default function DesignerCreationsScreen() {
    const params = useLocalSearchParams<{ creation_id?: string }>();

    return (
        <CreationsModule
            onBack={() => router.replace('/(designer)')}
            titleBack="← Volver al Atelier Diseñadora"
            initialCreationId={params.creation_id}
            onOpenClient={(clientId: string) => {
                router.push({
                    pathname: '/(designer)/clients',
                    params: { client_id: clientId },
                });
            }}
        />
    );
}
