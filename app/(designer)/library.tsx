// ==============================================================================
// ATELIER DIGITAL — PANTALLA: BIBLIOTECA DE DISEÑO & MOODBOARD (MÓDULO 04)
// Archivo: app/(designer)/library.tsx
// ==============================================================================

import React from 'react';
import { router } from 'expo-router';
import { DesignLibraryScreen } from '../../src/components/design/DesignLibraryScreen';

export default function DesignerLibraryRoute() {
    return (
        <DesignLibraryScreen
            onBack={() => router.replace('/(designer)')}
            onOpenCreations={() => router.push('/(designer)/creations')}
        />
    );
}

