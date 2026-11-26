import React from 'react';
import { Stack } from 'expo-router';
import { colors } from '../../src/theme/colors';
import { ClientPortalProvider } from '../../src/context/ClientPortalContext';

export default function ClientLayout() {
    return (
        <ClientPortalProvider>
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: colors.background },
                }}
            >
                <Stack.Screen name="index" />
                <Stack.Screen name="creation/[id]" />
            </Stack>
        </ClientPortalProvider>
    );
}
