import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
import { supabase } from '../../src/supabase';
import { translateAuthError, useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';
import { FormInput } from '../../src/components/FormInput';
import { FormButton } from '../../src/components/FormButton';

export default function ResetPasswordScreen() {
    const { session, signOut } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 860;

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checkingSession, setCheckingSession] = useState(true);
    const [hasValidSession, setHasValidSession] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [isSuccess, setIsSuccess] = useState(false);

    // Si AuthContext ya tiene o adquiere una sesión activa, marcar sesión válida
    useEffect(() => {
        if (session) {
            setHasValidSession(true);
            setCheckingSession(false);
        }
    }, [session]);

    useEffect(() => {
        let isMounted = true;

        const verifyRecoverySession = async () => {
            try {
                // 1. Extraer posibles errores o códigos de la URL (Web)
                if (typeof window !== 'undefined') {
                    let code: string | null = null;
                    let error: string | null = null;
                    let errorDesc: string | null = null;

                    if (window.location.search) {
                        const sParams = new URLSearchParams(window.location.search);
                        code = sParams.get('code');
                        error = sParams.get('error') || sParams.get('error_code');
                        errorDesc = sParams.get('error_description');
                    }

                    if (window.location.hash) {
                        const hashClean = window.location.hash.startsWith('#')
                            ? window.location.hash.substring(1)
                            : window.location.hash;
                        const hParams = new URLSearchParams(hashClean);
                        if (!code) code = hParams.get('code');
                        if (!error) error = hParams.get('error') || hParams.get('error_code');
                        if (!errorDesc) errorDesc = hParams.get('error_description');
                    }

                    // Si Supabase reporta un error en la URL (p.ej. otp_expired)
                    if (error || errorDesc) {
                        let translated =
                            'El enlace de recuperación es inválido o ha expirado. Por favor solicite uno nuevo.';
                        if (
                            (errorDesc && errorDesc.toLowerCase().includes('expired')) ||
                            error === 'otp_expired'
                        ) {
                            translated =
                                'El enlace de recuperación ha expirado. Por favor solicite un nuevo correo de restablecimiento.';
                        }
                        if (isMounted) {
                            setErrorMessage(translated);
                            setCheckingSession(false);
                        }
                        return;
                    }

                    // Si viene un código PKCE (?code=...), intercambiarlo por sesión si aún no existe
                    if (code) {
                        try {
                            const { data, error: exchangeError } =
                                await supabase.auth.exchangeCodeForSession(code);
                            if (data?.session && isMounted) {
                                setHasValidSession(true);
                                setCheckingSession(false);
                                return;
                            } else if (exchangeError) {
                                console.warn(
                                    '[ResetPassword] Advertencia en exchangeCodeForSession:',
                                    exchangeError.message,
                                );
                            }
                        } catch (e) {
                            console.warn('[ResetPassword] Error intercambiando código:', e);
                        }
                    }
                }

                // 2. Revisar si ya existe sesión activa en Supabase
                const {
                    data: { session: currentSession },
                } = await supabase.auth.getSession();

                if (currentSession) {
                    if (isMounted) {
                        setHasValidSession(true);
                        setCheckingSession(false);
                    }
                    return;
                }

                // 3. Suscribirse a eventos de autenticación por si el token de recuperación
                // está siendo procesado en segundo plano por detectSessionInUrl
                const {
                    data: { subscription },
                } = supabase.auth.onAuthStateChange((event, newSession) => {
                    if (
                        isMounted &&
                        (event === 'PASSWORD_RECOVERY' ||
                            event === 'SIGNED_IN' ||
                            event === 'USER_UPDATED') &&
                        newSession
                    ) {
                        setHasValidSession(true);
                        setCheckingSession(false);
                    }
                });

                // Temporizador de tolerancia por si el procesamiento tarda unos instantes
                const timer = setTimeout(() => {
                    if (isMounted) {
                        setCheckingSession(false);
                    }
                }, 2000);

                return () => {
                    clearTimeout(timer);
                    subscription.unsubscribe();
                };
            } catch (err) {
                console.warn('[ResetPassword] Error verificando sesión de recuperación:', err);
                if (isMounted) {
                    setCheckingSession(false);
                }
            }
        };

        const cleanupPromise = verifyRecoverySession();

        return () => {
            isMounted = false;
            cleanupPromise.then((cleanup) => {
                if (typeof cleanup === 'function') cleanup();
            });
        };
    }, []);

    const handleUpdatePassword = async () => {
        setErrorMessage(null);

        const cleanPassword = password.trim();
        const cleanConfirm = confirmPassword.trim();

        if (!cleanPassword) {
            setErrorMessage('Por favor ingrese su nueva contraseña.');
            return;
        }

        if (cleanPassword.length < 6) {
            setErrorMessage('La contraseña debe tener como mínimo 6 caracteres.');
            return;
        }

        if (!cleanConfirm) {
            setErrorMessage('Por favor confirme su nueva contraseña.');
            return;
        }

        if (cleanPassword !== cleanConfirm) {
            setErrorMessage(
                'Las contraseñas no coinciden. Por favor verifique que sean idénticas.',
            );
            return;
        }

        setLoading(true);

        try {
            const { error } = await supabase.auth.updateUser({
                password: cleanPassword,
            });

            if (error) {
                setErrorMessage(translateAuthError(error.message));
            } else {
                setIsSuccess(true);
                // Cerrar la sesión de recuperación para asegurar un login limpio con la nueva clave
                await signOut().catch(() => {});
            }
        } catch (err: any) {
            setErrorMessage(
                err?.message ||
                    'Ocurrió un error inesperado al actualizar la contraseña.',
            );
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = async () => {
        await signOut().catch(() => {});
        router.replace('/(auth)/login');
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
                <View
                    style={[
                        styles.editorialFrame,
                        isDesktop && styles.desktopFrame,
                    ]}
                >
                    {/* PANEL DE IDENTIDAD */}
                    <View
                        style={[
                            styles.brandPanel,
                            isDesktop && styles.brandPanelDesktop,
                        ]}
                    >
                        <View style={styles.brandPanelInner}>
                            <View style={styles.badgeTag}>
                                <Text style={styles.badgeTagText}>
                                    SEGURIDAD Y PRIVACIDAD
                                </Text>
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
                                «La excelencia de un atelier de autor reside en
                                la protección y cuidado de cada detalle de su
                                espacio confidencial.»
                            </Text>

                            <View style={styles.brandLine} />

                            <Text style={styles.brandFootnote}>
                                ACCESO CONFIDENCIAL · ATELIER DIGITAL
                            </Text>
                        </View>
                    </View>

                    {/* PANEL DE FORMULARIO */}
                    <View
                        style={[
                            styles.formPanel,
                            isDesktop && styles.formPanelDesktop,
                        ]}
                    >
                        <View style={styles.formPanelInner}>
                            <View style={styles.headerBlock}>
                                <Text style={styles.formEyebrow}>
                                    RESTABLECIMIENTO DE CLAVE
                                </Text>
                                <Text style={styles.formTitle}>
                                    Definir Nueva Clave
                                </Text>
                                <Text style={styles.formSubtitle}>
                                    Cree una nueva contraseña segura para
                                    acceder a su espacio privado en Atelier
                                    Digital.
                                </Text>
                                <View style={styles.divider} />
                            </View>

                            {checkingSession ? (
                                <View style={styles.checkingBox}>
                                    <ActivityIndicator
                                        size="small"
                                        color={colors.champagneGold}
                                    />
                                    <Text style={styles.checkingText}>
                                        Verificando enlace de seguridad...
                                    </Text>
                                </View>
                            ) : isSuccess ? (
                                <View style={styles.successBox}>
                                    <View style={styles.successIconBadge}>
                                        <Text style={styles.successIconText}>
                                            ✦
                                        </Text>
                                    </View>
                                    <Text style={styles.successTitle}>
                                        Contraseña Actualizada
                                    </Text>
                                    <Text style={styles.successText}>
                                        Su clave de acceso ha sido restablecida
                                        con éxito. Ahora puede iniciar sesión con
                                        sus nuevas credenciales.
                                    </Text>

                                    <FormButton
                                        title="Ingresar al Atelier"
                                        onPress={() =>
                                            router.replace('/(auth)/login')
                                        }
                                        variant="primary"
                                    />
                                </View>
                            ) : !hasValidSession && !session ? (
                                <View style={styles.noSessionBox}>
                                    <Text style={styles.noSessionTitle}>
                                        Enlace no detectado o expirado
                                    </Text>
                                    <Text style={styles.noSessionText}>
                                        {errorMessage ||
                                            'Para definir una nueva contraseña, debe hacer clic en el enlace seguro enviado a su correo electrónico. Si el enlace ha expirado, puede solicitar uno nuevo.'}
                                    </Text>

                                    <View style={styles.buttonContainer}>
                                        <FormButton
                                            title="Solicitar Nuevo Enlace"
                                            onPress={() =>
                                                router.replace(
                                                    '/(auth)/forgot-password',
                                                )
                                            }
                                            variant="primary"
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={styles.backButton}
                                        onPress={() =>
                                            router.replace('/(auth)/login')
                                        }
                                    >
                                        <Text style={styles.backButtonText}>
                                            ← Regresar al inicio de sesión
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <>
                                    {errorMessage && (
                                        <View style={styles.errorBox}>
                                            <Text style={styles.errorText}>
                                                {errorMessage}
                                            </Text>
                                        </View>
                                    )}

                                    <FormInput
                                        label="Nueva contraseña"
                                        placeholder="Mínimo 6 caracteres"
                                        value={password}
                                        onChangeText={(text) => {
                                            setPassword(text);
                                            if (errorMessage) setErrorMessage(null);
                                        }}
                                        secureTextEntry={!showPassword}
                                        editable={!loading}
                                        rightAccessory={
                                            <TouchableOpacity
                                                onPress={() => setShowPassword((prev) => !prev)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Text style={styles.toggleVisibilityText}>
                                                    {showPassword ? 'Ocultar' : 'Mostrar'}
                                                </Text>
                                            </TouchableOpacity>
                                        }
                                    />

                                    <FormInput
                                        label="Confirmar nueva contraseña"
                                        placeholder="Repita la nueva contraseña"
                                        value={confirmPassword}
                                        onChangeText={(text) => {
                                            setConfirmPassword(text);
                                            if (errorMessage) setErrorMessage(null);
                                        }}
                                        secureTextEntry={!showConfirmPassword}
                                        editable={!loading}
                                        rightAccessory={
                                            <TouchableOpacity
                                                onPress={() => setShowConfirmPassword((prev) => !prev)}
                                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                                            >
                                                <Text style={styles.toggleVisibilityText}>
                                                    {showConfirmPassword ? 'Ocultar' : 'Mostrar'}
                                                </Text>
                                            </TouchableOpacity>
                                        }
                                    />

                                    <View style={styles.buttonContainer}>
                                        <FormButton
                                            title="Actualizar Contraseña"
                                            onPress={handleUpdatePassword}
                                            variant="primary"
                                            loading={loading}
                                        />
                                    </View>

                                    <TouchableOpacity
                                        style={styles.backButton}
                                        onPress={handleCancel}
                                        disabled={loading}
                                    >
                                        <Text style={styles.backButtonText}>
                                            ← Cancelar y volver al inicio de sesión
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
    checkingBox: {
        paddingVertical: 32,
        alignItems: 'center',
        gap: 12,
    },
    checkingText: {
        color: colors.textSecondary,
        fontSize: 12,
        fontFamily: typography.sans,
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
    noSessionBox: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 2,
        padding: 20,
        alignItems: 'center',
        marginBottom: 16,
    },
    noSessionTitle: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    noSessionText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 19,
        textAlign: 'center',
        marginBottom: 20,
        fontFamily: typography.sans,
    },
    buttonContainer: {
        width: '100%',
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
    toggleVisibilityText: {
        color: colors.champagneGold,
        fontSize: 11,
        fontWeight: '600',
        fontFamily: typography.sans,
        letterSpacing: 0.5,
    },
});
