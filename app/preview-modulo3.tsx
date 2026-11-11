// ==============================================================================
// ATELIER DIGITAL — PREVIEW Y VALIDACIÓN E2E: MÓDULO 03 (CREACIONES Y CICLO COMERCIAL)
// Archivo: app/preview-modulo3.tsx
// ==============================================================================

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { CreationsModule } from '../src/components/creations/CreationsModule';
import { colors } from '../src/theme/colors';

export default function PreviewModulo3Screen() {
    const params = useLocalSearchParams<{ creation_id?: string }>();

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <CreationsModule
                onBack={() => router.replace('/')}
                titleBack="← Volver a Portada Atelier"
                initialCreationId={params.creation_id}
                onOpenClient={(clientId: string) => {
                    console.log('[Preview Módulo 3] Abrir clienta:', clientId);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
});
