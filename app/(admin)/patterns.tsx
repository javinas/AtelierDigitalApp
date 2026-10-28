// ==============================================================================
// ATELIER DIGITAL — PANTALLA: MOTOR DE PATRONAJE (ADMINISTRADOR)
// Archivo: app/(admin)/patterns.tsx
// ==============================================================================

import React from 'react';
import { router } from 'expo-router';
import { PatternModule } from '../../src/components/pattern/PatternModule';

export default function AdminPatternsScreen() {
    return (
        <PatternModule
            onBack={() => router.replace('/(admin)')}
            titleBack="← Volver al Panel Administrador"
        />
    );
}
