// ==============================================================================
// ATELIER DIGITAL — PREVIEW Y EVALUACIÓN: VISUALIZADOR CORPORAL 3D
// Archivo: app/mannequin-preview.tsx
// ==============================================================================
// Pantalla temporal e independiente para evaluar el prototipo Mannequin3DStudioSandbox
// desde el navegador web sin modificar M02, Flujo B, patronaje ni pantallas de producción.
// 100% reversible: eliminar este archivo retira la ruta por completo.
// ==============================================================================

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Mannequin3DStudioSandbox } from '../src/components/mannequin3d/Mannequin3DStudioSandbox';
import { colors } from '../src/theme/colors';

export default function MannequinPreviewScreen() {
    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <Mannequin3DStudioSandbox
                onClose={() => router.replace('/')}
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

