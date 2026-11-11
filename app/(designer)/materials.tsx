// ==============================================================================
// ATELIER DIGITAL — PANTALLA: MATERIALES, PROVEEDORES Y TRM MANUAL (MÓDULO 05)
// Archivo: app/(designer)/materials.tsx
// ==============================================================================

import React from 'react';
import { router } from 'expo-router';
import { MaterialsStudioScreen } from '../../src/components/commercial/MaterialsStudioScreen';

export default function DesignerMaterialsRoute() {
    return (
        <MaterialsStudioScreen
            onBack={() => router.replace('/(designer)')}
            onOpenCreations={() => router.push('/(designer)/creations')}
        />
    );
}

