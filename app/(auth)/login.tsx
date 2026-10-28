import React, { useState } from 'react';
import {
    Image,
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { FormInput } from '../../src/components/FormInput';
import { FormButton } from '../../src/components/FormButton';

export default function LoginScreen() {
    const { signIn } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 860;

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleLogin = async () => {
        setErrorMessage(null);

        if (!email.trim() || !password) {
            setErrorMessage('Por favor ingrese su correo y contraseña.');
            return;
        }

        setLoading(true);
        try {
            const { error } = await signIn(email, password);
            if (error) {
                setErrorMessage(error);
            }
        } catch (err: any) {
            setErrorMessage(
                err?.message || 'Ocurrió un error inesperado al intentar iniciar sesión.',
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.keyboardContainer}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <StatusBar style="dark" />
            <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.editorialFrame, isDesktop && styles.desktopFrame]}>
                    {/* PANEL DE IDENTIDAD (Visible en lateral en desktop, superior en móvil) */}
                    <View style={[styles.brandPanel, isDesktop && styles.brandPanelDesktop]}>
                        <View style={styles.brandPanelInner}>
                            <View style={styles.badgeTag}>
                                <Text style={styles.badgeTagText}>ATELIER DE AUTOR</Text>
                            </View>

                            <View style={styles.logoContainer}>
                                <Image
                                    source={require('../../assets/logo_transparent.png')}
                                    style={styles.logoImage}
                                    resizeMode="contain"
                                />
                            </View>

                            <Image
                                source={require('../../assets/flourish.png')}
                                style={styles.flourishImage}
                                resizeMode="contain"
                            />

                            <Text style={styles.brandQuote}>
                                «Cada silueta es una obra de arte concebida para celebrar
                                su elegancia única.»
                            </Text>

                            <View style={styles.brandLine} />

                            <Text style={styles.brandFootnote}>
                                ALTA COSTURA · BARRANQUILLA
                            </Text>
                        </View>
                    </View>

                    {/* PANEL DE FORMULARIO */}
                    <View style={[styles.formPanel, isDesktop && styles.formPanelDesktop]}>
                        <View style={styles.formPanelInner}>
                            <View style={styles.headerBlock}>
                                <Text style={styles.formEyebrow}>
                                    ESPACIO PRIVADO
                                </Text>
                                <Text style={styles.formTitle}>
                                    Acceso al Atelier
                                </Text>
                                <Text style={styles.formSubtitle}>
                                    Ingrese sus credenciales para acceder a su espacio confidencial de confección.
                                </Text>
                                <View style={styles.divider} />
                            </View>

                            {errorMessage && (
                                <View style={styles.errorBox}>
                                    <Text style={styles.errorText}>{errorMessage}</Text>
                                </View>
                            )}

                            <FormInput
                                label="Correo electrónico"
                                placeholder="su-correo@atelier.com"
                                value={email}
                                onChangeText={setEmail}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!loading}
                            />

                            <FormInput
                                label="Contraseña"
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                editable={!loading}
                                rightAccessory={
                                    <TouchableOpacity
                                        onPress={() => router.push('/(auth)/forgot-password')}
                                        disabled={loading}
                                    >
                                        <Text style={styles.forgotLink}>
                                            ¿Olvidó su contraseña?
                                        </Text>
                                    </TouchableOpacity>
                                }
                            />

                            <View style={styles.buttonContainer}>
                                <FormButton
                                    title="Ingresar al Atelier"
                                    onPress={handleLogin}
                                    variant="primary"
                                    loading={loading}
                                />
                            </View>

                            <View style={styles.footerSection}>
                                <View style={styles.footerRow}>
                                    <Text style={styles.footerText}>¿Aún no tiene cuenta?</Text>
                                    <TouchableOpacity
                                        onPress={() => router.push('/(auth)/register')}
                                        disabled={loading}
                                    >
                                        <Text style={styles.registerLink}>
                                            Solicitar cuenta de clienta
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={styles.backLink}
                                    onPress={() => router.push('/')}
                                    disabled={loading}
                                >
                                    <Text style={styles.backLinkText}>
                                        ← Regresar a la portada del atelier
                                    </Text>
                                </TouchableOpacity>

                                <View style={styles.legalLinksRow}>
                                    <TouchableOpacity
                                        onPress={() => router.push('/politica-privacidad' as any)}
                                        disabled={loading}
                                    >
                                        <Text style={styles.legalLinkText}>Privacidad</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.legalDot}>·</Text>
                                    <TouchableOpacity
                                        onPress={() => router.push('/terminos-condiciones' as any)}
                                        disabled={loading}
                                    >
                                        <Text style={styles.legalLinkText}>Términos</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.legalDot}>·</Text>
                                    <TouchableOpacity
                                        onPress={() => router.push('/aviso-privacidad' as any)}
                                        disabled={loading}
                                    >
                                        <Text style={styles.legalLinkText}>Aviso de Datos</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    keyboardContainer: {
        flex: 1,
        backgroundColor: colors.ivoryWarm,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 48,
        paddingHorizontal: 20,
    },
    editorialFrame: {
        width: '100%',
        maxWidth: 440,
        backgroundColor: '#FFFFFF',
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
        shadowColor: colors.atelierBlack,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 16,
        elevation: 3,
    },
    desktopFrame: {
        maxWidth: 880,
        flexDirection: 'row',
        minHeight: 520,
    },

    /* ================= PANEL DE IDENTIDAD ================= */
    brandPanel: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 28,
        paddingVertical: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    brandPanelDesktop: {
        flex: 1,
        paddingHorizontal: 36,
        paddingVertical: 48,
        borderRightWidth: 1,
        borderRightColor: '#2B231D',
    },
    brandPanelInner: {
        alignItems: 'center',
        width: '100%',
    },
    badgeTag: {
        borderBottomWidth: 1,
        borderTopWidth: 1,
        borderColor: colors.champagneGold,
        paddingVertical: 4,
        paddingHorizontal: 12,
        marginBottom: 16,
    },
    badgeTagText: {
        color: colors.champagneGold,
        fontSize: 9,
        letterSpacing: 2.5,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    logoContainer: {
        paddingVertical: 6,
        marginBottom: 8,
    },
    logoImage: {
        width: 190,
        height: 54,
    },
    flourishImage: {
        width: 44,
        height: 18,
        marginBottom: 16,
        opacity: 0.85,
    },
    brandQuote: {
        color: '#D1C6BA',
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        fontStyle: 'italic',
        fontFamily: typography.serif,
        marginBottom: 20,
        maxWidth: 280,
    },
    brandLine: {
        width: 24,
        height: 1,
        backgroundColor: colors.champagneGold,
        opacity: 0.5,
        marginBottom: 12,
    },
    brandFootnote: {
        color: colors.champagneGold,
        fontSize: 9,
        letterSpacing: 2,
        fontWeight: '600',
        fontFamily: typography.sans,
    },

    /* ================= PANEL DE FORMULARIO ================= */
    formPanel: {
        backgroundColor: '#FCFAF7',
        paddingHorizontal: 28,
        paddingVertical: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    formPanelDesktop: {
        flex: 1.25,
        paddingHorizontal: 44,
        paddingVertical: 44,
    },
    formPanelInner: {
        width: '100%',
        maxWidth: 380,
    },
    headerBlock: {
        alignItems: 'center',
        marginBottom: 24,
    },
    formEyebrow: {
        color: colors.champagneGold,
        fontSize: 10,
        letterSpacing: 2.5,
        fontWeight: '700',
        fontFamily: typography.sans,
        marginBottom: 6,
    },
    formTitle: {
        color: colors.atelierBlack,
        fontSize: 26,
        lineHeight: 32,
        fontWeight: '400',
        fontFamily: typography.serif,
        textAlign: 'center',
        marginBottom: 8,
    },
    formSubtitle: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        fontFamily: typography.sans,
    },
    divider: {
        width: 32,
        height: 1,
        backgroundColor: colors.sand,
        marginTop: 14,
    },
    errorBox: {
        backgroundColor: colors.errorBg,
        borderColor: colors.errorBorder,
        borderWidth: 1,
        borderRadius: 2,
        padding: 12,
        marginBottom: 20,
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
        lineHeight: 17,
        textAlign: 'center',
        fontFamily: typography.sans,
    },
    forgotLink: {
        color: colors.champagneGold,
        fontSize: 11,
        letterSpacing: 0.3,
        fontFamily: typography.sans,
        textDecorationLine: 'underline',
    },
    buttonContainer: {
        marginTop: 6,
        marginBottom: 22,
    },
    footerSection: {
        alignItems: 'center',
        gap: 12,
    },
    footerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    footerText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontFamily: typography.sans,
    },
    registerLink: {
        color: colors.champagneGold,
        fontSize: 12,
        fontWeight: '600',
        fontFamily: typography.sans,
        textDecorationLine: 'underline',
    },
    backLink: {
        paddingVertical: 6,
    },
    backLinkText: {
        color: colors.textMuted,
        fontSize: 11,
        fontFamily: typography.sans,
    },
    legalLinksRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        marginTop: 4,
    },
    legalLinkText: {
        color: colors.textMuted,
        fontSize: 10.5,
        fontFamily: typography.sans,
        textDecorationLine: 'underline',
    },
    legalDot: {
        color: colors.champagneGold,
        fontSize: 10.5,
    },
});
