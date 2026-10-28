import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Image,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import PublicHeader from '../src/components/PublicHeader';
import PublicFooter from '../src/components/PublicFooter';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { SERVICES } from '../src/data/servicesData';
import {
    LegalConsentCheckbox,
    PrivacyNoticeBanner,
} from '../src/components/PrivacyNoticeBanner';

export default function ContactoScreen() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 940;
    const params = useLocalSearchParams<{ servicio?: string }>();

    // Form states
    const [nombre, setNombre] = useState('');
    const [email, setEmail] = useState('');
    const [telefono, setTelefono] = useState('');
    const [servicioSeleccionado, setServicioSeleccionado] = useState(
        params.servicio || 'alta-costura'
    );
    const [descripcion, setDescripcion] = useState('');
    const [privacyAccepted, setPrivacyAccepted] = useState(false);

    // Error states
    const [errors, setErrors] = useState<{
        nombre?: string;
        email?: string;
        descripcion?: string;
        privacidad?: string;
    }>({});

    // Submission states
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [submittedData, setSubmittedData] = useState<{
        nombre: string;
        email: string;
        telefono?: string;
        servicioNombre: string;
        descripcion: string;
    } | null>(null);

    useEffect(() => {
        if (params.servicio) {
            setServicioSeleccionado(params.servicio);
        }
    }, [params.servicio]);

    const validateForm = () => {
        const newErrors: typeof errors = {};

        if (!nombre.trim()) {
            newErrors.nombre = 'Por favor, ingresa tu nombre completo.';
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email.trim()) {
            newErrors.email = 'Por favor, ingresa tu correo electrónico.';
        } else if (!emailRegex.test(email.trim())) {
            newErrors.email = 'El formato del correo electrónico no es válido.';
        }

        if (!descripcion.trim()) {
            newErrors.descripcion = 'Por favor, describe tu idea o requerimiento.';
        } else if (descripcion.trim().length < 10) {
            newErrors.descripcion = 'La descripción debe tener al menos 10 caracteres.';
        }

        if (!privacyAccepted) {
            newErrors.privacidad =
                'Debes autorizar el tratamiento de tus datos conforme a la Política de Privacidad para enviar la consulta.';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
        if (!validateForm()) return;

        setIsSubmitting(true);

        const currentService =
            servicioSeleccionado === 'proteccion-datos'
                ? 'Solicitud de Protección de Datos Personales (Habeas Data · Ley 1581)'
                : SERVICES.find((s) => s.id === servicioSeleccionado)?.title ||
                  servicioSeleccionado;

        // Simulamos el procesamiento local del formulario validado
        setTimeout(() => {
            setSubmittedData({
                nombre: nombre.trim(),
                email: email.trim(),
                telefono: telefono.trim() || undefined,
                servicioNombre: currentService,
                descripcion: descripcion.trim(),
            });
            setIsSubmitting(false);
            setIsSubmitted(true);
        }, 600);
    };

    const handleReset = () => {
        setNombre('');
        setEmail('');
        setTelefono('');
        setDescripcion('');
        setPrivacyAccepted(false);
        setErrors({});
        setIsSubmitted(false);
        setSubmittedData(null);
    };

    const openInstagram = () => {
        Linking.openURL('https://www.instagram.com/carrollkatherine/').catch((err) =>
            console.warn('Error al abrir Instagram:', err)
        );
    };

    return (
        <ScrollView
            style={styles.root}
            contentContainerStyle={styles.rootContent}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar style="light" />
            <PublicHeader currentRoute="contacto" />

            {/* Hero Header */}
            <View style={styles.heroSection}>
                <View style={styles.heroContent}>
                    <Text style={styles.badgeLabel}>CONTACTO DIRECTO · ATELIER BY KATHERINE CARROLL</Text>
                    <Text style={styles.mainTitle}>
                        Hablemos de tu próxima creación.
                    </Text>

                    <Text style={styles.introText}>
                        «Cuéntanos qué tienes en mente, para qué ocasión necesitas tu diseño o qué
                        solución de confección estás buscando. Queremos conocer tu idea y orientarte
                        sobre los siguientes pasos».
                    </Text>

                    <View style={styles.flourishRow}>
                        <View style={styles.flourishLine} />
                        <Image
                            source={require('../assets/flourish.png')}
                            style={styles.flourishIcon}
                            resizeMode="contain"
                        />
                        <View style={styles.flourishLine} />
                    </View>
                </View>
            </View>

            {/* Main Content: Form + Atelier Details */}
            <View style={styles.contentSection}>
                <View style={[styles.mainLayout, isDesktop && styles.mainLayoutDesktop]}>
                    {/* Columna Izquierda: Formulario o Confirmación */}
                    <View style={[styles.formContainer, isDesktop && styles.formContainerDesktop]}>
                        {isSubmitted && submittedData ? (
                            /* Vista de confirmación con explicación transparente de integración */
                            <View style={styles.confirmationBox}>
                                <View style={styles.confirmationHeader}>
                                    <View style={styles.confirmCheckBadge}>
                                        <Text style={styles.confirmCheckIcon}>✓</Text>
                                    </View>
                                    <Text style={styles.confirmTitle}>
                                        Consulta preparada con éxito
                                    </Text>
                                    <Text style={styles.confirmSubtitle}>
                                        Gracias por escribirnos, {submittedData.nombre}.
                                    </Text>
                                </View>

                                <View style={styles.confirmDetailsCard}>
                                    <Text style={styles.confirmDetailsHeading}>RESUMEN DE TU SOLICITUD</Text>
                                    <View style={styles.confirmDetailRow}>
                                        <Text style={styles.confirmDetailLabel}>Servicio:</Text>
                                        <Text style={styles.confirmDetailValue}>
                                            {submittedData.servicioNombre}
                                        </Text>
                                    </View>
                                    <View style={styles.confirmDetailRow}>
                                        <Text style={styles.confirmDetailLabel}>Correo:</Text>
                                        <Text style={styles.confirmDetailValue}>{submittedData.email}</Text>
                                    </View>
                                    {submittedData.telefono && (
                                        <View style={styles.confirmDetailRow}>
                                            <Text style={styles.confirmDetailLabel}>Teléfono:</Text>
                                            <Text style={styles.confirmDetailValue}>
                                                {submittedData.telefono}
                                            </Text>
                                        </View>
                                    )}
                                    <View style={styles.confirmDetailMessage}>
                                        <Text style={styles.confirmDetailLabel}>Detalle:</Text>
                                        <Text style={styles.confirmDetailMessageText}>
                                            {submittedData.descripcion}
                                        </Text>
                                    </View>
                                </View>

                                {/* Mensaje transparente sobre integración del servicio de correo */}
                                <View style={styles.technicalNoteBox}>
                                    <Text style={styles.technicalNoteTitle}>ESTADO DE INTEGRACIÓN TÉCNICA</Text>
                                    <Text style={styles.technicalNoteText}>
                                        El formulario se encuentra completamente validado y estructurado en
                                        la aplicación. Para que los mensajes se despachen automáticamente al
                                        buzón de la diseñadora, está pendiente conectar el servicio de envío
                                        transaccional (como Resend, SendGrid o Supabase Edge Functions) o el canal
                                        directo de mensajería comercial verificado.
                                    </Text>
                                </View>

                                <View style={styles.confirmActionsRow}>
                                    <TouchableOpacity
                                        style={styles.resetButton}
                                        onPress={handleReset}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.resetButtonText}>ENVIAR OTRA CONSULTA</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={styles.backHomeButton}
                                        onPress={() => router.push('/')}
                                        activeOpacity={0.85}
                                    >
                                        <Text style={styles.backHomeButtonText}>VOLVER AL INICIO</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            /* Formulario funcional */
                            <View style={styles.formBox}>
                                <Text style={styles.formTitle}>Formulario de Consulta</Text>
                                <Text style={styles.formIntro}>
                                    Diligencia los campos a continuación para brindarte una atención
                                    acorde a lo que buscas.
                                </Text>

                                {/* Nombre */}
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>
                                        NOMBRE COMPLETO <Text style={styles.requiredAsterisk}>*</Text>
                                    </Text>
                                    <TextInput
                                        style={[styles.textInput, errors.nombre ? styles.inputError : null]}
                                        placeholder="Ej. María Fernanda Gómez"
                                        placeholderTextColor="#766B62"
                                        value={nombre}
                                        onChangeText={(val) => {
                                            setNombre(val);
                                            if (errors.nombre) setErrors({ ...errors, nombre: undefined });
                                        }}
                                    />
                                    {errors.nombre && (
                                        <Text style={styles.errorMessage}>{errors.nombre}</Text>
                                    )}
                                </View>

                                {/* Correo */}
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>
                                        CORREO ELECTRÓNICO <Text style={styles.requiredAsterisk}>*</Text>
                                    </Text>
                                    <TextInput
                                        style={[styles.textInput, errors.email ? styles.inputError : null]}
                                        placeholder="nombre@ejemplo.com"
                                        placeholderTextColor="#766B62"
                                        keyboardType="email-address"
                                        autoCapitalize="none"
                                        value={email}
                                        onChangeText={(val) => {
                                            setEmail(val);
                                            if (errors.email) setErrors({ ...errors, email: undefined });
                                        }}
                                    />
                                    {errors.email && (
                                        <Text style={styles.errorMessage}>{errors.email}</Text>
                                    )}
                                </View>

                                {/* Teléfono (opcional) */}
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>
                                        TELÉFONO / WHATSAPP <Text style={styles.optionalTag}>(OPCIONAL)</Text>
                                    </Text>
                                    <TextInput
                                        style={styles.textInput}
                                        placeholder="Ej. +57 300 123 4567"
                                        placeholderTextColor="#766B62"
                                        keyboardType="phone-pad"
                                        value={telefono}
                                        onChangeText={setTelefono}
                                    />
                                </View>

                                {/* Servicio de interés (8 categorías) */}
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>
                                        SERVICIO DE INTERÉS <Text style={styles.requiredAsterisk}>*</Text>
                                    </Text>
                                    <View style={styles.serviceSelector}>
                                        {SERVICES.map((srv) => {
                                            const isSelected = servicioSeleccionado === srv.id;
                                            return (
                                                <TouchableOpacity
                                                    key={srv.id}
                                                    style={[
                                                        styles.serviceChip,
                                                        isSelected && styles.serviceChipSelected,
                                                    ]}
                                                    onPress={() => setServicioSeleccionado(srv.id)}
                                                    activeOpacity={0.8}
                                                >
                                                    <Text
                                                        style={[
                                                            styles.serviceChipText,
                                                            isSelected && styles.serviceChipTextSelected,
                                                        ]}
                                                    >
                                                        {srv.title}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
                                        <TouchableOpacity
                                            style={[
                                                styles.serviceChip,
                                                servicioSeleccionado === 'proteccion-datos' &&
                                                    styles.serviceChipSelected,
                                            ]}
                                            onPress={() =>
                                                setServicioSeleccionado('proteccion-datos')
                                            }
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={[
                                                    styles.serviceChipText,
                                                    servicioSeleccionado === 'proteccion-datos' &&
                                                        styles.serviceChipTextSelected,
                                                ]}
                                            >
                                                Habeas Data / Protección de Datos (Ley 1581)
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {/* Descripción de la solicitud */}
                                <View style={styles.fieldGroup}>
                                    <Text style={styles.fieldLabel}>
                                        DESCRIPCIÓN DE LA SOLICITUD <Text style={styles.requiredAsterisk}>*</Text>
                                    </Text>
                                    <TextInput
                                        style={[
                                            styles.textAreaInput,
                                            errors.descripcion ? styles.inputError : null,
                                        ]}
                                        placeholder="Describe la ocasión, idea, cantidad estimada o fechas tentativas que tengas en mente..."
                                        placeholderTextColor="#766B62"
                                        multiline
                                        numberOfLines={5}
                                        textAlignVertical="top"
                                        value={descripcion}
                                        onChangeText={(val) => {
                                            setDescripcion(val);
                                            if (errors.descripcion)
                                                setErrors({ ...errors, descripcion: undefined });
                                        }}
                                    />
                                    {errors.descripcion && (
                                        <Text style={styles.errorMessage}>{errors.descripcion}</Text>
                                    )}
                                </View>

                                {/* Aviso de Privacidad y Consentimiento en Formulario de Contacto */}
                                <PrivacyNoticeBanner compact />

                                <View style={styles.fieldGroup}>
                                    <LegalConsentCheckbox
                                        checked={privacyAccepted}
                                        onToggle={() => {
                                            const nextVal = !privacyAccepted;
                                            setPrivacyAccepted(nextVal);
                                            if (nextVal && errors.privacidad) {
                                                setErrors({ ...errors, privacidad: undefined });
                                            }
                                        }}
                                        required
                                        testID="contact-privacy-checkbox"
                                    >
                                        Autorizo de manera previa, expresa e informada a Atelier
                                        Digital · By Katherine Carroll para tratar los datos
                                        suministrados en este formulario con el fin de atender mi
                                        consulta o solicitud, conforme a la{' '}
                                        <Text
                                            style={{
                                                color: colors.bronze,
                                                fontWeight: '600',
                                                textDecorationLine: 'underline',
                                            }}
                                            onPress={() =>
                                                router.push('/politica-privacidad' as any)
                                            }
                                        >
                                            Política de Tratamiento de Datos Personales
                                        </Text>
                                        .
                                    </LegalConsentCheckbox>
                                    {errors.privacidad && (
                                        <Text style={styles.errorMessage}>{errors.privacidad}</Text>
                                    )}
                                </View>

                                {/* Botón Enviar Consulta */}
                                <TouchableOpacity
                                    style={styles.submitButton}
                                    onPress={handleSubmit}
                                    disabled={isSubmitting}
                                    activeOpacity={0.88}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="#171411" size="small" />
                                    ) : (
                                        <>
                                            <Text style={styles.submitButtonText}>ENVIAR CONSULTA</Text>
                                            <Text style={styles.submitButtonArrow}>→</Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Columna Derecha: Información Editorial y Redes */}
                    <View style={[styles.infoSidebar, isDesktop && styles.infoSidebarDesktop]}>
                        <View style={styles.brandInfoCard}>
                            <Image
                                source={require('../assets/logo_transparent.png')}
                                style={styles.sidebarLogo}
                                resizeMode="contain"
                            />
                            <Text style={styles.sidebarMotto}>
                                «La creatividad detrás de cada creación»
                            </Text>

                            <View style={styles.sidebarDivider} />

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>UBICACIÓN</Text>
                                <Text style={styles.infoValue}>
                                    Villa Carolina · Barranquilla, Colombia (Atención previa cita)
                                </Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>CANALES DIRECTOS</Text>
                                <Text style={styles.infoValue}>info@bykatherinecarroll.com</Text>
                                <Text style={styles.infoValue}>+57 305 243 0400</Text>
                            </View>

                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>REDES OFICIALES</Text>
                                <TouchableOpacity
                                    style={styles.instagramCta}
                                    onPress={openInstagram}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.instagramCtaText}>@carrollkatherine en Instagram</Text>
                                    <Text style={styles.instagramCtaArrow}>↗</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={styles.sidebarDivider} />

                            <View style={styles.atelierNoticeBox}>
                                <Text style={styles.atelierNoticeTitle}>CLIENTAS REGISTRADAS</Text>
                                <Text style={styles.atelierNoticeText}>
                                    Si ya tienes una cuenta en Atelier Digital, puedes iniciar sesión
                                    para hacer seguimiento de tus prendas y citas de prueba.
                                </Text>
                                <TouchableOpacity
                                    style={styles.loginSidebarLink}
                                    onPress={() => router.push('/(auth)/login')}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.loginSidebarLinkText}>
                                        Ir al inicio de sesión →
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            <PublicFooter />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#171411',
    },
    rootContent: {
        flexGrow: 1,
    },
    heroSection: {
        backgroundColor: '#171411',
        paddingVertical: 64,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(167, 131, 80, 0.2)',
    },
    heroContent: {
        maxWidth: 820,
        alignItems: 'center',
        textAlign: 'center',
    },
    badgeLabel: {
        color: colors.champagneGold,
        fontSize: 11,
        letterSpacing: 3,
        fontWeight: '700',
        marginBottom: 16,
        fontFamily: typography.sans,
        textAlign: 'center',
    },
    mainTitle: {
        color: '#FFFFFF',
        fontSize: 34,
        lineHeight: 42,
        fontFamily: typography.serif,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
    },
    introText: {
        color: '#D4C8B8',
        fontSize: 16,
        lineHeight: 26,
        fontFamily: typography.serif,
        textAlign: 'center',
        marginBottom: 28,
        paddingHorizontal: 12,
    },
    flourishRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        width: '60%',
        maxWidth: 320,
    },
    flourishLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(167, 131, 80, 0.35)',
    },
    flourishIcon: {
        width: 32,
        height: 16,
        opacity: 0.9,
    },
    contentSection: {
        backgroundColor: '#1C1814',
        paddingVertical: 64,
        paddingHorizontal: 24,
    },
    mainLayout: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        width: '100%',
        flexDirection: 'column',
        gap: 36,
    },
    mainLayoutDesktop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    formContainer: {
        width: '100%',
    },
    formContainerDesktop: {
        flex: 1.6,
    },
    formBox: {
        backgroundColor: '#171411',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.25)',
        padding: 32,
    },
    formTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontFamily: typography.serif,
        fontWeight: '600',
        marginBottom: 8,
    },
    formIntro: {
        color: '#9C9185',
        fontSize: 13.5,
        lineHeight: 20,
        marginBottom: 24,
        fontFamily: typography.sans,
    },
    fieldGroup: {
        marginBottom: 20,
    },
    fieldLabel: {
        color: colors.champagneGold,
        fontSize: 10.5,
        letterSpacing: 1.5,
        fontWeight: '700',
        marginBottom: 8,
        fontFamily: typography.sans,
    },
    requiredAsterisk: {
        color: '#E06B6B',
    },
    optionalTag: {
        color: '#766B62',
        fontSize: 9.5,
        fontWeight: '400',
    },
    textInput: {
        backgroundColor: '#221D18',
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.3)',
        borderRadius: 6,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#F8F2E9',
        fontSize: 14,
        fontFamily: typography.sans,
    },
    textAreaInput: {
        backgroundColor: '#221D18',
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.3)',
        borderRadius: 6,
        paddingHorizontal: 16,
        paddingVertical: 14,
        color: '#F8F2E9',
        fontSize: 14,
        minHeight: 120,
        fontFamily: typography.sans,
    },
    inputError: {
        borderColor: '#E06B6B',
    },
    errorMessage: {
        color: '#E06B6B',
        fontSize: 12,
        marginTop: 6,
        fontFamily: typography.sans,
    },
    serviceSelector: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    serviceChip: {
        backgroundColor: '#221D18',
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.25)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
    },
    serviceChipSelected: {
        backgroundColor: colors.champagneGold,
        borderColor: colors.champagneGold,
    },
    serviceChipText: {
        color: '#B5A99B',
        fontSize: 12,
        fontFamily: typography.sans,
    },
    serviceChipTextSelected: {
        color: '#171411',
        fontWeight: '700',
    },
    submitButton: {
        backgroundColor: colors.champagneGold,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 14,
        borderRadius: 4,
        marginTop: 10,
    },
    submitButtonText: {
        color: '#171411',
        fontSize: 12,
        letterSpacing: 2,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    submitButtonArrow: {
        color: '#171411',
        fontSize: 14,
        fontWeight: '700',
    },
    confirmationBox: {
        backgroundColor: '#171411',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        padding: 32,
    },
    confirmationHeader: {
        alignItems: 'center',
        marginBottom: 24,
    },
    confirmCheckBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(167, 131, 80, 0.2)',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    confirmCheckIcon: {
        color: colors.champagneGold,
        fontSize: 22,
        fontWeight: '700',
    },
    confirmTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontFamily: typography.serif,
        fontWeight: '600',
        marginBottom: 6,
        textAlign: 'center',
    },
    confirmSubtitle: {
        color: '#B5A99B',
        fontSize: 14,
        fontFamily: typography.sans,
        textAlign: 'center',
    },
    confirmDetailsCard: {
        backgroundColor: '#221D18',
        borderRadius: 6,
        padding: 20,
        marginBottom: 20,
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
    },
    confirmDetailsHeading: {
        color: colors.champagneGold,
        fontSize: 10,
        letterSpacing: 1.5,
        fontWeight: '700',
        marginBottom: 12,
        fontFamily: typography.sans,
    },
    confirmDetailRow: {
        flexDirection: 'row',
        marginBottom: 8,
        gap: 8,
    },
    confirmDetailLabel: {
        color: '#9C9185',
        fontSize: 13,
        fontWeight: '600',
        fontFamily: typography.sans,
        width: 70,
    },
    confirmDetailValue: {
        color: '#FFFFFF',
        fontSize: 13,
        flex: 1,
        fontFamily: typography.sans,
    },
    confirmDetailMessage: {
        marginTop: 6,
    },
    confirmDetailMessageText: {
        color: '#E6D9C8',
        fontSize: 13,
        lineHeight: 19,
        marginTop: 4,
        fontFamily: typography.sans,
    },
    technicalNoteBox: {
        backgroundColor: 'rgba(167, 131, 80, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.25)',
        borderRadius: 6,
        padding: 16,
        marginBottom: 24,
    },
    technicalNoteTitle: {
        color: colors.champagneGold,
        fontSize: 10,
        letterSpacing: 1.5,
        fontWeight: '700',
        marginBottom: 6,
        fontFamily: typography.sans,
    },
    technicalNoteText: {
        color: '#9C9185',
        fontSize: 12,
        lineHeight: 18,
        fontFamily: typography.sans,
    },
    confirmActionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    resetButton: {
        backgroundColor: colors.champagneGold,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 4,
    },
    resetButtonText: {
        color: '#171411',
        fontSize: 11,
        letterSpacing: 1.5,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    backHomeButton: {
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 4,
    },
    backHomeButtonText: {
        color: colors.champagneGold,
        fontSize: 11,
        letterSpacing: 1.5,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    infoSidebar: {
        width: '100%',
    },
    infoSidebarDesktop: {
        flex: 1,
    },
    brandInfoCard: {
        backgroundColor: '#171411',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.25)',
        padding: 32,
    },
    sidebarLogo: {
        width: 170,
        height: 44,
        marginBottom: 12,
    },
    sidebarMotto: {
        color: colors.champagneGold,
        fontSize: 13,
        fontFamily: typography.serif,
        fontStyle: 'italic',
        marginBottom: 20,
    },
    sidebarDivider: {
        height: 1,
        backgroundColor: 'rgba(167, 131, 80, 0.25)',
        marginVertical: 20,
    },
    infoRow: {
        marginBottom: 16,
    },
    infoLabel: {
        color: colors.champagneGold,
        fontSize: 10,
        letterSpacing: 1.5,
        fontWeight: '700',
        marginBottom: 6,
        fontFamily: typography.sans,
    },
    infoValue: {
        color: '#F8F2E9',
        fontSize: 14,
        fontFamily: typography.sans,
    },
    instagramCta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(167, 131, 80, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.4)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    instagramCtaText: {
        color: '#F8F2E9',
        fontSize: 12.5,
        fontWeight: '600',
        fontFamily: typography.sans,
    },
    instagramCtaArrow: {
        color: colors.champagneGold,
        fontSize: 12,
    },
    atelierNoticeBox: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 6,
        padding: 16,
    },
    atelierNoticeTitle: {
        color: colors.champagneGold,
        fontSize: 10,
        letterSpacing: 1.5,
        fontWeight: '700',
        marginBottom: 6,
        fontFamily: typography.sans,
    },
    atelierNoticeText: {
        color: '#9C9185',
        fontSize: 12,
        lineHeight: 18,
        marginBottom: 12,
        fontFamily: typography.sans,
    },
    loginSidebarLink: {
        paddingVertical: 4,
    },
    loginSidebarLinkText: {
        color: colors.champagneGold,
        fontSize: 12,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
});
