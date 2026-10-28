import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { LEGAL_DOCUMENT_VERSIONS } from '../../src/constants/legalDocuments';

export default function ClientHomeScreen() {
    const { user, profile, signOut } = useAuth();

    const handleSignOut = async () => {
        await signOut();
    };

    const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Clienta';
    const displayEmail = profile?.email || user?.email || '';

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* Header superior */}
            <View style={styles.topBar}>
                <View>
                    <Text style={styles.brandTitle}>ATELIER DIGITAL</Text>
                    <Text style={styles.brandSubtitle}>Espacio de Clienta</Text>
                </View>

                <View style={styles.topBarActions}>
                    <TouchableOpacity
                        style={styles.publicHomeButton}
                        onPress={() => router.push('/diseno' as any)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.publicHomeButtonText}>Explorar Atelier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.signOutButton}
                        onPress={handleSignOut}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.signOutButtonText}>Cerrar Sesión</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Tarjeta de bienvenida y perfil */}
                <View style={styles.welcomeCard}>
                    <View style={styles.roleBadge}>
                        <Text style={styles.roleBadgeText}>CLIENTA</Text>
                    </View>

                    <Text style={styles.greetingTitle}>Bienvenida, {displayName}</Text>
                    <Text style={styles.greetingSubtitle}>{displayEmail}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.sessionInfoText}>
                        Has iniciado sesión de forma segura en tu portal personal de Atelier Digital.
                    </Text>
                </View>

                {/* Información sobre el avance del portal */}
                <View style={styles.infoCard}>
                    <Text style={styles.infoTitle}>Tu experiencia de confección</Text>
                    <Text style={styles.infoText}>
                        En este espacio exclusivo podrás dar seguimiento a cada detalle de tus prendas de alta costura diseñadas por Katherine Carroll.
                    </Text>

                    <View style={styles.featuresList}>
                        <View style={styles.featureItem}>
                            <Text style={styles.featureBullet}>✦</Text>
                            <Text style={styles.featureText}>
                                Consulta de tus medidas registradas y confirmadas.
                            </Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Text style={styles.featureBullet}>✦</Text>
                            <Text style={styles.featureText}>
                                Estado en tiempo real del proceso de diseño y confección.
                            </Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Text style={styles.featureBullet}>✦</Text>
                            <Text style={styles.featureText}>
                                Próximas citas para pruebas de vestuario y ajustes finales.
                            </Text>
                        </View>
                    </View>

                    <View style={styles.noteBox}>
                        <Text style={styles.noteText}>
                            Estas funciones estarán disponibles en los próximos módulos del Atelier. Tu cuenta ya se encuentra activa y vinculada de manera segura.
                        </Text>
                    </View>
                </View>

                {/* Tarjeta de Privacidad, Derechos ARCO y Transparencia Legal */}
                <View style={styles.legalCard}>
                    <View style={styles.legalHeaderRow}>
                        <Text style={styles.legalEyebrow}>
                            PRIVACIDAD, HABEAS DATA & TRANSPARENCIA · LEY 1581 DE 2012
                        </Text>
                        <Text style={styles.legalVersionBadge}>
                            v{LEGAL_DOCUMENT_VERSIONS.PRIVACY_POLICY}
                        </Text>
                    </View>

                    <Text style={styles.legalTitle}>
                        Custodia de tus Datos y Derechos de Titular
                    </Text>
                    <Text style={styles.legalText}>
                        Tus datos de contacto, fichas antropométricas y registros de confección se encuentran protegidos bajo políticas de seguridad por fila (Row Level Security). En cualquier momento puedes ejercer tus derechos a conocer, actualizar, rectificar o solicitar la supresión de tus datos, así como revocar autorizaciones opcionales.
                    </Text>

                    <View style={styles.legalPillsRow}>
                        <TouchableOpacity
                            style={styles.legalPill}
                            onPress={() => router.push('/politica-privacidad' as any)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.legalPillText}>Política de Privacidad</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.legalPill}
                            onPress={() => router.push('/terminos-condiciones' as any)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.legalPillText}>Términos de Uso</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.legalPill}
                            onPress={() => router.push('/aviso-privacidad' as any)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.legalPillText}>Aviso de Privacidad</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.legalPill}
                            onPress={() => router.push('/politica-cookies' as any)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.legalPillText}>Política de Cookies</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.legalPill}
                            onPress={() => router.push('/ia-transparencia' as any)}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.legalPillText}>Transparencia IA</Text>
                        </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                        style={styles.arcoActionButton}
                        onPress={() =>
                            router.push({
                                pathname: '/contacto' as any,
                                params: { servicio: 'proteccion-datos' },
                            })
                        }
                        activeOpacity={0.85}
                    >
                        <Text style={styles.arcoActionButtonText}>
                            RADICAR CONSULTA, RECTIFICACIÓN O SOLICITUD SOBRE MIS DATOS →
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingTop: 48,
        paddingBottom: 18,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    brandTitle: {
        color: colors.accent,
        fontSize: 14,
        letterSpacing: 3,
        fontWeight: '700',
    },
    brandSubtitle: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    topBarActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    publicHomeButton: {
        borderWidth: 1,
        borderColor: colors.accent,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    publicHomeButtonText: {
        color: colors.accentDark,
        fontSize: 12,
        fontWeight: '600',
    },
    signOutButton: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: colors.surfaceSubtle,
    },
    signOutButtonText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: '500',
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingVertical: 28,
        maxWidth: 720,
        width: '100%',
        alignSelf: 'center',
    },
    welcomeCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#29231F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    roleBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.line,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        marginBottom: 12,
    },
    roleBadgeText: {
        color: '#FAF7F2',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    greetingTitle: {
        color: colors.textPrimary,
        fontSize: 22,
        fontWeight: '500',
        marginBottom: 4,
    },
    greetingSubtitle: {
        color: colors.textSecondary,
        fontSize: 14,
    },
    divider: {
        height: 1,
        backgroundColor: colors.line,
        marginVertical: 16,
        width: 48,
    },
    sessionInfoText: {
        color: colors.textMuted,
        fontSize: 12,
        lineHeight: 18,
    },
    infoCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 24,
        marginBottom: 24,
    },
    infoTitle: {
        color: colors.textPrimary,
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 8,
    },
    infoText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 18,
    },
    featuresList: {
        gap: 12,
        marginBottom: 20,
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    featureBullet: {
        color: colors.accent,
        fontSize: 12,
        marginTop: 2,
    },
    featureText: {
        color: colors.textPrimary,
        fontSize: 13,
        lineHeight: 19,
        flex: 1,
    },
    noteBox: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 6,
        padding: 12,
        borderLeftWidth: 3,
        borderLeftColor: colors.line,
    },
    noteText: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
    },

    /* Tarjeta Legal y Derechos ARCO */
    legalCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        padding: 24,
    },
    legalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    legalEyebrow: {
        color: colors.accent,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    legalVersionBadge: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '600',
    },
    legalTitle: {
        color: colors.textPrimary,
        fontSize: 17,
        fontWeight: '600',
        marginBottom: 8,
    },
    legalText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 16,
    },
    legalPillsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 18,
    },
    legalPill: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingVertical: 7,
        paddingHorizontal: 12,
    },
    legalPillText: {
        color: colors.textPrimary,
        fontSize: 11.5,
        fontWeight: '500',
    },
    arcoActionButton: {
        backgroundColor: colors.atelierBlack,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 4,
        paddingVertical: 11,
        paddingHorizontal: 14,
        alignItems: 'center',
    },
    arcoActionButtonText: {
        color: colors.ivoryWarm,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        textAlign: 'center',
    },
});
