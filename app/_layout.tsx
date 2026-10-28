
import React, { useEffect } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { Stack, usePathname, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { injectGlobalWebStyles } from '../src/theme/webStyles';

injectGlobalWebStyles();

function NavigationGate({ children }: { children: React.ReactNode }) {
    const { session, role, loading } = useAuth();
    const segments = useSegments();
    const pathname = usePathname();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        const segs = segments as unknown as string[];
        const currentGroup = segs[0] as string | undefined;
        const currentScreen = segs[1] as string | undefined;
        const inAuthGroup = currentGroup === '(auth)';
        const inDesignerGroup =
            currentGroup === '(designer)' ||
            currentGroup === 'creations' ||
            currentGroup === 'clients' ||
            currentGroup === 'patterns' ||
            currentGroup === 'pattern-bank' ||
            pathname === '/creations' ||
            pathname === '/clients' ||
            pathname === '/patterns' ||
            pathname === '/pattern-bank';
        const inClientGroup = currentGroup === '(client)';
        const inAdminGroup = currentGroup === '(admin)';

        // 1. Detección exhaustiva y determinística del flujo de restablecimiento de contraseña:
        // A. Por pathname visible de Expo Router
        const isPathReset =
            pathname === '/reset-password' ||
            pathname === '/(auth)/reset-password' ||
            pathname?.endsWith('/reset-password');

        // B. Por segmentos resueltos de Expo Router
        const isSegmentsReset =
            segs.includes('reset-password') ||
            (inAuthGroup && currentScreen === 'reset-password') ||
            currentGroup === 'reset-password';

        // C. Por inspección directa de la URL del navegador (en entorno Web)
        const isBrowserReset =
            typeof window !== 'undefined' &&
            (window.location.pathname === '/reset-password' ||
                window.location.pathname === '/reset-password/' ||
                window.location.pathname.includes('reset-password') ||
                window.location.pathname.includes('(auth)/reset-password') ||
                window.location.hash.includes('type=recovery') ||
                window.location.search.includes('type=recovery') ||
                (window.location.search.includes('code=') &&
                    window.location.pathname.includes('reset-password')));

        const isResetPassword = isPathReset || isSegmentsReset || isBrowserReset;

        // 2. REGLA FUNDAMENTAL:
        // Si el usuario está en el flujo de restablecimiento de contraseña,
        // PERMANECER OBLIGATORIAMENTE en él. NO ejecutar ninguna redirección automática basada en rol o sesión.
        if (isResetPassword) {
            return;
        }

        // 3. Si la URL contiene hash/parámetro de recuperación de Supabase Auth (#access_token=...&type=recovery),
        // pero aún no estamos en reset-password, redirigir de inmediato a la pantalla de restablecimiento de clave
        if (
            typeof window !== 'undefined' &&
            !window.location.pathname.includes('reset-password') &&
            ((window.location.hash && window.location.hash.includes('type=recovery')) ||
                (window.location.search && window.location.search.includes('type=recovery')))
        ) {
            router.replace('/(auth)/reset-password');
            return;
        }

        if (!session) {
            if (
                inDesignerGroup ||
                inClientGroup ||
                inAdminGroup
            ) {
                router.replace('/(auth)/login');
            }
            return;
        }

        // Una sesión sin perfil o con rol desconocido no obtiene acceso privado.
        if (!role) {
            if (!inAuthGroup) {
                router.replace('/(auth)/login');
            }
            return;
        }

        // Tolerancia: Si aún no se ha resuelto el grupo actual en Expo Router, esperar resolución
        if (!currentGroup) {
            return;
        }

        // Determinar el espacio de entrada permitido para cada rol.
        if (inAuthGroup) {
            if (role === 'admin') {
                router.replace('/(admin)');
            } else if (role === 'designer') {
                router.replace('/(designer)');
            } else {
                router.replace('/(client)');
            }
            return;
        }

        if (role === 'admin') {
            if (!inAdminGroup) router.replace('/(admin)');
            return;
        }

        if (role === 'designer') {
            if (!inDesignerGroup) router.replace('/(designer)');
            return;
        }

        if (role === 'client') {
            if (!inClientGroup) router.replace('/(client)');
        }
    }, [session, role, loading, segments, pathname, router]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <StatusBar style="dark" />
                <Text style={styles.loadingBrand}>ATELIER DIGITAL</Text>
                <ActivityIndicator color={colors.champagneGold} size="small" />
                <Text style={styles.loadingText}>Restaurando sesión...</Text>
            </View>
        );
    }

    return <>{children}</>;
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <NavigationGate>
                <Stack
                    screenOptions={{
                        headerShown: false,
                        contentStyle: { backgroundColor: colors.ivoryWarm },
                    }}
                />
            </NavigationGate>
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        backgroundColor: colors.ivoryWarm,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    loadingBrand: {
        color: colors.champagneGold,
        fontSize: 12,
        letterSpacing: 4,
        fontWeight: '700',
        fontFamily: typography.sans,
        marginBottom: 20,
    },
    loadingText: {
        color: colors.textSecondary,
        fontSize: 13,
        marginTop: 14,
        letterSpacing: 0.5,
        fontFamily: typography.sans,
    },
});
