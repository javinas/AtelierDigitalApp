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

export default function ForgotPasswordScreen() {
    const { resetPassword } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 860;

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [emailSent, setEmailSent] = useState(false);

    const handleReset = async () => {
        setErrorMessage(null);

        if (!email.trim()) {
            setErrorMessage('Por favor ingrese su correo electrónico.');
            return;
        }

        setLoading(true);
        const { error } = await resetPassword(email);
        setLoading(false);

        if (error) {
            setErrorMessage(error);
        } else {
            setEmailSent(true);
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
                    {/* PANEL DE IDENTIDAD */}
                    <View style={[styles.brandPanel, isDesktop && styles.brandPanelDesktop]}>
                        <View style={styles.brandPanelInner}>
                            <View style={styles.badgeTag}>
                                <Text style={styles.badgeTagText}>SEGURIDAD</Text>
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
                                «La confidencialidad y tranquilidad de nuestras clientas
                                son el pilar fundamental de nuestra atención personalizada.»
                            </Text>

                            <View style={styles.brandLine} />

                            <Text style={styles.brandFootnote}>
                                ACCESO CONFIDENCIAL
                            </Text>
                        </View>
                    </View>

                    {/* PANEL DE FORMULARIO */}
                    <View style={[styles.formPanel, isDesktop && styles.formPanelDesktop]}>
                        <View style={styles.formPanelInner}>
                            <View style={styles.headerBlock}>
                                <Text style={styles.formEyebrow}>
                                    RECUPERACIÓN DE ACCESO
                                </Text>
                                <Text style={styles.formTitle}>
                                    Restablecer Clave
                                </Text>
                                <Text style={styles.formSubtitle}>
                                    Ingrese el correo asociado a su cuenta para recibir un enlace seguro de restablecimiento.
                                </Text>
                                <View style={styles.divider} />
                            </View>

                            {emailSent ? (
                                <View style={styles.successBox}>
                                    <View style={styles.successIconBadge}>
                                        <Text style={styles.successIconText}>✉</Text>
                                    </View>
                                    <Text style={styles.successTitle}>
                                        Instrucciones Enviadas
                                    </Text>
                                    <Text style={styles.successText}>
                                        Si existe una cuenta vinculada a{' '}
                                        <Text style={styles.boldText}>{email}</Text>,
                                        recibirá un correo electrónico con las indicaciones para crear una nueva clave.
                                    </Text>

                                    <FormButton
                                        title="Volver a Iniciar Sesión"
                                        onPress={() => router.replace('/(auth)/login')}
                                        variant="primary"
                                    />
                                </View>
                            ) : (
                                <>
                                    {errorMessage && (
                                        <View style={styles.errorBox}>
                                            <Text style={styles.errorText}>{errorMessage}</Text>
                                        </View>
                                    )}

                                    <FormInput
                                        label="Correo electrónico"
                                        placeholder="su-correo@ejemplo.com"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        editable={!loading}
                                    />

                                    <View style={styles.buttonContainer}>
                                        <FormButton
                                            title="Enviar Instrucciones"
                                            onPress={handleReset}
                                            variant="primary"
                                            loading={loading}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={styles.backButton}
                                        onPress={() => router.replace('/(auth)/login')}
                                        disabled={loading}
                                    >
                                        <Text style={styles.backButtonText}>
                                            ← Regresar al inicio de sesión
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            )}
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
        minHeight: 500,
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
    successBox: {
        backgroundColor: '#FFFFFF',
        borderColor: colors.champagneGold,
        borderWidth: 1,
        borderRadius: 2,
        padding: 24,
        alignItems: 'center',
        marginBottom: 16,
    },
    successIconBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.champagneGold,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 14,
    },
    successIconText: {
        color: colors.ivoryWarm,
        fontSize: 18,
    },
    successTitle: {
        color: colors.atelierBlack,
        fontSize: 18,
        fontWeight: '400',
        textAlign: 'center',
        marginBottom: 10,
        fontFamily: typography.serif,
    },
    successText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 22,
        fontFamily: typography.sans,
    },
    boldText: {
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    buttonContainer: {
        marginTop: 4,
        marginBottom: 20,
    },
    backButton: {
        alignSelf: 'center',
        paddingVertical: 8,
    },
    backButtonText: {
        color: colors.textMuted,
        fontSize: 11,
        fontFamily: typography.sans,
    },
});
