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
import {
    LegalConsentCheckbox,
    PrivacyNoticeBanner,
} from '../../src/components/PrivacyNoticeBanner';
import { LEGAL_DOCUMENT_VERSIONS } from '../../src/constants/legalDocuments';

export default function RegisterScreen() {
    const { signUp } = useAuth();
    const { width } = useWindowDimensions();
    const isDesktop = width >= 860;

    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Estados de consentimiento granular (ninguna casilla viene premarcada)
    const [ageConfirmed, setAgeConfirmed] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [marketingOptIn, setMarketingOptIn] = useState(false);

    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [confirmationSent, setConfirmationSent] = useState(false);

    const handleRegister = async () => {
        setErrorMessage(null);

        if (!fullName.trim()) {
            setErrorMessage('Por favor ingrese su nombre completo.');
            return;
        }

        if (!email.trim() || !password) {
            setErrorMessage('Por favor complete todos los campos requeridos.');
            return;
        }

        if (password.length < 6) {
            setErrorMessage('La contraseña debe tener como mínimo 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            setErrorMessage('Las contraseñas no coinciden. Por favor verifíquelas.');
            return;
        }

        if (!ageConfirmed) {
            setErrorMessage(
                'El registro en Atelier Digital está reservado a mayores de 18 años. Por favor confirme su mayoría de edad.',
            );
            return;
        }

        if (!termsAccepted) {
            setErrorMessage(
                'Debe leer y aceptar los Términos y Condiciones de Uso para crear su cuenta.',
            );
            return;
        }

        if (!privacyAccepted) {
            setErrorMessage(
                'Debe autorizar el tratamiento de sus datos personales conforme a la Política de Privacidad (Ley 1581 de 2012) para continuar.',
            );
            return;
        }

        setLoading(true);
        const { error, needsEmailConfirmation } = await signUp(
            email,
            password,
            fullName,
            {
                ageConfirmed,
                termsAccepted,
                privacyAccepted,
                marketingOptIn,
                termsVersion: LEGAL_DOCUMENT_VERSIONS.TERMS_OF_SERVICE,
                privacyVersion: LEGAL_DOCUMENT_VERSIONS.PRIVACY_POLICY,
            },
        );
        setLoading(false);

        if (error) {
            setErrorMessage(error);
        } else if (needsEmailConfirmation) {
            setConfirmationSent(true);
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
                                <Text style={styles.badgeTagText}>NUEVA CLIENTA</Text>
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
                                «Su ficha personalizada es el primer paso para dar vida
                                a un diseño inolvidable, confeccionado a su medida.»
                            </Text>

                            <View style={styles.brandLine} />

                            <Text style={styles.brandFootnote}>
                                ALTA COSTURA · EXCLUSIVIDAD
                            </Text>

                            <View style={styles.trustPanelBox}>
                                <Text style={styles.trustPanelTitle}>CUSTODIA Y PRIVACIDAD</Text>
                                <Text style={styles.trustPanelText}>
                                    Sus datos de contacto y futuras fichas antropométricas se
                                    protegen bajo estricta reserva y conforme a la Ley 1581 de 2012.
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* PANEL DE FORMULARIO */}
                    <View style={[styles.formPanel, isDesktop && styles.formPanelDesktop]}>
                        <View style={styles.formPanelInner}>
                            <View style={styles.headerBlock}>
                                <Text style={styles.formEyebrow}>
                                    REGISTRO DE CLIENTA · +18 AÑOS
                                </Text>
                                <Text style={styles.formTitle}>
                                    Crear Cuenta
                                </Text>
                                <Text style={styles.formSubtitle}>
                                    Complete sus datos para crear su perfil exclusivo y acompañar el avance de sus prendas.
                                </Text>
                                <View style={styles.divider} />
                            </View>

                            {confirmationSent ? (
                                <View style={styles.successBox}>
                                    <View style={styles.successIconBadge}>
                                        <Text style={styles.successIconText}>✓</Text>
                                    </View>
                                    <Text style={styles.successTitle}>
                                        Registro y Autorización Recibidos
                                    </Text>
                                    <Text style={styles.successText}>
                                        Hemos enviado un mensaje de confirmación a{' '}
                                        <Text style={styles.boldText}>{email}</Text> y registrado la
                                        trazabilidad de su consentimiento legal (v
                                        {LEGAL_DOCUMENT_VERSIONS.PRIVACY_POLICY}). Por favor abra el
                                        enlace recibido en su bandeja de entrada para activar su
                                        cuenta antes de iniciar sesión.
                                    </Text>

                                    <FormButton
                                        title="Ir a Iniciar Sesión"
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
                                        label="Nombre completo"
                                        placeholder="Ej. María Fernanda Gómez"
                                        value={fullName}
                                        onChangeText={setFullName}
                                        editable={!loading}
                                    />

                                    <FormInput
                                        label="Correo electrónico"
                                        placeholder="su-correo@ejemplo.com"
                                        value={email}
                                        onChangeText={setEmail}
                                        autoCapitalize="none"
                                        keyboardType="email-address"
                                        editable={!loading}
                                    />

                                    <FormInput
                                        label="Contraseña"
                                        placeholder="Mínimo 6 caracteres"
                                        value={password}
                                        onChangeText={setPassword}
                                        secureTextEntry
                                        editable={!loading}
                                    />

                                    <FormInput
                                        label="Confirmar contraseña"
                                        placeholder="Repita su contraseña"
                                        value={confirmPassword}
                                        onChangeText={setConfirmPassword}
                                        secureTextEntry
                                        editable={!loading}
                                    />

                                    {/* AVISO DE PRIVACIDAD BREVE VISIBLE */}
                                    <PrivacyNoticeBanner compact />

                                    {/* SECCIÓN DE CONSENTIMIENTOS GRANULARES */}
                                    <View style={styles.consentsContainer}>
                                        <Text style={styles.consentsTitle}>
                                            DECLARACIONES Y AUTORIZACIONES LEGALES
                                        </Text>

                                        {/* 1. Mayoría de edad (+18) */}
                                        <LegalConsentCheckbox
                                            checked={ageConfirmed}
                                            onToggle={() => setAgeConfirmed(!ageConfirmed)}
                                            required
                                            disabled={loading}
                                            testID="checkbox-age-confirmation"
                                        >
                                            Declaro que soy{' '}
                                            <Text style={styles.boldText}>
                                                mayor de dieciocho (18) años
                                            </Text>{' '}
                                            y cuento con capacidad legal para registrarme en la
                                            plataforma (Ley 27 de 1977). Si encargo prendas para
                                            menores de edad, actúo como su representante legal.
                                        </LegalConsentCheckbox>

                                        {/* 2. Términos y Condiciones */}
                                        <LegalConsentCheckbox
                                            checked={termsAccepted}
                                            onToggle={() => setTermsAccepted(!termsAccepted)}
                                            required
                                            disabled={loading}
                                            testID="checkbox-terms-acceptance"
                                        >
                                            He leído y acepto los{' '}
                                            <Text
                                                style={styles.inlineLink}
                                                onPress={() =>
                                                    router.push('/terminos-condiciones' as any)
                                                }
                                            >
                                                Términos y Condiciones de Uso
                                            </Text>{' '}
                                            (v{LEGAL_DOCUMENT_VERSIONS.TERMS_OF_SERVICE}) y la{' '}
                                            <Text
                                                style={styles.inlineLink}
                                                onPress={() =>
                                                    router.push('/ia-transparencia' as any)
                                                }
                                            >
                                                Política de Transparencia en IA
                                            </Text>
                                            .
                                        </LegalConsentCheckbox>

                                        {/* 3. Política de Tratamiento de Datos Personales */}
                                        <LegalConsentCheckbox
                                            checked={privacyAccepted}
                                            onToggle={() => setPrivacyAccepted(!privacyAccepted)}
                                            required
                                            disabled={loading}
                                            testID="checkbox-privacy-acceptance"
                                        >
                                            Autorizo de manera previa, expresa e informada el
                                            tratamiento de mis datos personales conforme a la{' '}
                                            <Text
                                                style={styles.inlineLink}
                                                onPress={() =>
                                                    router.push('/politica-privacidad' as any)
                                                }
                                            >
                                                Política de Tratamiento de Datos Personales
                                            </Text>{' '}
                                            (v{LEGAL_DOCUMENT_VERSIONS.PRIVACY_POLICY}) y el{' '}
                                            <Text
                                                style={styles.inlineLink}
                                                onPress={() =>
                                                    router.push('/aviso-privacidad' as any)
                                                }
                                            >
                                                Aviso de Privacidad
                                            </Text>
                                            .
                                        </LegalConsentCheckbox>

                                        {/* 4. Consentimiento comercial separado (Opcional, no premarcado) */}
                                        <LegalConsentCheckbox
                                            checked={marketingOptIn}
                                            onToggle={() => setMarketingOptIn(!marketingOptIn)}
                                            required={false}
                                            disabled={loading}
                                            testID="checkbox-marketing-optin"
                                        >
                                            Deseo recibir invitaciones a lanzamientos de colección,
                                            eventos de alta costura y novedades editoriales de By
                                            Katherine Carroll.
                                        </LegalConsentCheckbox>
                                    </View>

                                    <View style={styles.securityNotice}>
                                        <Text style={styles.securityNoticeText}>
                                            ✦ Las cuentas creadas en este formulario se asignan al perfil de Clienta. El acceso de Diseñadora es exclusivo y se gestiona internamente.
                                        </Text>
                                    </View>

                                    <View style={styles.buttonContainer}>
                                        <FormButton
                                            title="Registrar Cuenta"
                                            onPress={handleRegister}
                                            variant="primary"
                                            loading={loading}
                                        />
                                    </View>

                                    <View style={styles.footerSection}>
                                        <View style={styles.footerRow}>
                                            <Text style={styles.footerText}>¿Ya tiene una cuenta?</Text>
                                            <TouchableOpacity
                                                onPress={() => router.push('/(auth)/login')}
                                                disabled={loading}
                                            >
                                                <Text style={styles.loginLink}>
                                                    Iniciar sesión aquí
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
                                    </View>
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
        maxWidth: 460,
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
        maxWidth: 980,
        flexDirection: 'row',
        minHeight: 620,
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
        flex: 0.95,
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
        marginBottom: 24,
    },
    trustPanelBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.25)',
        borderRadius: 3,
        padding: 14,
        maxWidth: 280,
    },
    trustPanelTitle: {
        color: colors.champagneGold,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.8,
        fontFamily: typography.sans,
        marginBottom: 4,
        textAlign: 'center',
    },
    trustPanelText: {
        color: '#9C9185',
        fontSize: 11,
        lineHeight: 16,
        fontFamily: typography.sans,
        textAlign: 'center',
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
        flex: 1.35,
        paddingHorizontal: 44,
        paddingVertical: 44,
    },
    formPanelInner: {
        width: '100%',
        maxWidth: 440,
    },
    headerBlock: {
        alignItems: 'center',
        marginBottom: 22,
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
        marginBottom: 18,
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
        lineHeight: 17,
        textAlign: 'center',
        fontFamily: typography.sans,
    },
    consentsContainer: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 3,
        padding: 14,
        marginBottom: 16,
    },
    consentsTitle: {
        color: colors.atelierBlack,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        fontFamily: typography.sans,
        marginBottom: 12,
    },
    inlineLink: {
        color: colors.bronze,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    securityNotice: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 2,
        padding: 12,
        marginBottom: 18,
        borderLeftWidth: 2,
        borderLeftColor: colors.champagneGold,
    },
    securityNoticeText: {
        color: colors.textSecondary,
        fontSize: 11,
        lineHeight: 16,
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
        fontSize: 16,
        fontWeight: '700',
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
    loginLink: {
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
});
