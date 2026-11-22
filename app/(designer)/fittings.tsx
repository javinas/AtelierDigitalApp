// ==============================================================================
// ATELIER DIGITAL — PANTALLA: BANDEJA TRANSVERSAL DE PRUEBAS & AJUSTES (MÓDULO 06)
// Archivo: app/(designer)/fittings.tsx
// ==============================================================================

import React from 'react';
import { router } from 'expo-router';
import { FittingQueueScreen } from '../../src/components/fitting/FittingQueueScreen';

export default function DesignerFittingsRoute() {
    return (
        <FittingQueueScreen
            onBack={() => router.replace('/(designer)')}
            onOpenCreations={() => router.push('/(designer)/creations')}
            onOpenCreation={(creationId: string) => {
                router.push({
                    pathname: '/(designer)/creations',
                    params: { creation_id: creationId },
                });
            }}
        />
    );
}

