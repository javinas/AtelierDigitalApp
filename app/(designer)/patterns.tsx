// ==============================================================================
// ATELIER DIGITAL — PANTALLA: MOTOR DE PATRONAJE (DISEÑADORA)
// Archivo: app/(designer)/patterns.tsx
// ==============================================================================

import React from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { PatternModule } from '../../src/components/pattern/PatternModule';
import { GarmentType } from '../../src/types/pattern/pattern';

export default function DesignerPatternsScreen() {
    const params = useLocalSearchParams<{
        creation_id?: string;
        client_id?: string;
        session_id?: string;
        garment_type?: string;
        workflow?: 'hub' | 'measurements' | 'direct_pattern' | 'creation_pattern' | 'free_pattern';
    }>();

    const isFromCreation = Boolean(params.creation_id);

    return (
        <PatternModule
            onBack={() => {
                if (isFromCreation) {
                    router.replace('/(designer)/creations');
                } else {
                    router.replace('/(designer)');
                }
            }}
            titleBack={isFromCreation ? "← Volver a Creaciones" : "← Volver al Atelier Diseñadora"}
            initialClientId={params.client_id || null}
            initialSessionId={params.session_id || null}
            initialCreationId={params.creation_id || null}
            initialGarmentType={(params.garment_type as GarmentType) || null}
            initialWorkflow={params.workflow || (params.creation_id ? 'creation_pattern' : 'hub')}
        />
    );
}
