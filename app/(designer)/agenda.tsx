// ==============================================================================
// ATELIER DIGITAL — PANTALLA: AGENDA UNIFICADA DEL ATELIER (MÓDULO 08)
// Archivo: app/(designer)/agenda.tsx
// ==============================================================================

import React from 'react';
import { router } from 'expo-router';
import { AgendaStudioScreen } from '../../src/components/agenda/AgendaStudioScreen';

export default function DesignerAgendaRoute() {
    return (
        <AgendaStudioScreen
            onBack={() => router.replace('/(designer)')}
            onOpenClient={(clientId: string) => {
                router.push({
                    pathname: '/(designer)/clients',
                    params: { client_id: clientId },
                });
            }}
            onOpenCreation={(creationId: string) => {
                router.push({
                    pathname: '/(designer)/creations',
                    params: { creation_id: creationId },
                });
            }}
            onOpenFittings={() => router.push('/(designer)/fittings')}
        />
    );
}
