// ==============================================================================
// ATELIER DIGITAL — PANTALLA: DIRECTORIO DE CLIENTES (ADMINISTRACIÓN)
// Archivo: app/(admin)/clients.tsx
// ==============================================================================

import React from 'react';
import { router } from 'expo-router';
import { ClientsModule } from '../../src/components/clients/ClientsModule';

export default function AdminClientsScreen() {
    return (
        <ClientsModule
            onBack={() => router.replace('/(admin)')}
            titleBack="← Volver a Usuarios y Roles"
        />
    );
}
