// ==============================================================================
// ATELIER DIGITAL — PANTALLA: BANDEJA TRANSVERSAL DE FINANZAS & COSTOS (MÓDULO 07)
// Archivo: app/(designer)/finances.tsx
// ==============================================================================

import React from 'react';
import { router } from 'expo-router';
import { FinancialStudioScreen } from '../../src/components/commercial/FinancialStudioScreen';

export default function DesignerFinancesRoute() {
    return (
        <FinancialStudioScreen
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

