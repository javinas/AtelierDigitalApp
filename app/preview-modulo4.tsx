// ==============================================================================
// ATELIER DIGITAL — PREVIEW Y VALIDACIÓN E2E: MÓDULO 04 (DISEÑO, MOODBOARD Y BIBLIOTECA)
// Archivo: app/preview-modulo4.tsx
// ==============================================================================

import React from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { DesignLibraryScreen } from '../src/components/design/DesignLibraryScreen';
import { colors } from '../src/theme/colors';

export default function PreviewModulo4Screen() {
    return (
        <View style={styles.container}>
            <StatusBar style="dark" />
            <DesignLibraryScreen
                onBack={() => router.replace('/')}
                onOpenCreations={() => router.push('/preview-modulo3')}
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

