// ==============================================================================
// ATELIER DIGITAL — PANTALLA: BANCO GLOBAL DE PATRONES (DISEÑADORA)
// Archivo: app/(designer)/pattern-bank.tsx
// ==============================================================================

import React from 'react';
import { router } from 'expo-router';
import { PatternBankModule } from '../../src/components/pattern/PatternBankModule';

export default function DesignerPatternBankScreen() {
    return (
        <PatternBankModule
            onBack={() => router.replace('/(designer)')}
            titleBack="← Volver al Atelier Diseñadora"
            onOpenCad={(params) => {
                router.push({
                    pathname: '/(designer)/patterns',
                    params: {
                        client_id: params.clientId || undefined,
                        session_id: params.sessionId || undefined,
                        creation_id: params.creationId || undefined,
                        garment_type: params.garmentType || undefined,
                    },
                });
            }}
            onOpenClientDossier={(clientId) => {
                router.push({
                    pathname: '/(designer)/clients',
                    params: { client_id: clientId },
                });
            }}
            onOpenCreation={(_creationId) => {
                router.push('/(designer)/creations');
            }}
        />
    );
}
