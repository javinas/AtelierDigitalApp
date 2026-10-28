// ==============================================================================
// ATELIER DIGITAL — CONFIGURACIÓN GLOBAL DE LA PLATAFORMA
// Archivo: app/(admin)/settings.tsx
// ==============================================================================
// Interfaz administrativa para consultar y modificar la configuración global:
// - Datos del atelier (nombre comercial, correo, teléfono)
// - Preferencias regionales (idioma, moneda, formato de fecha)
// - Acceso exclusivo protegido mediante RLS (public.is_admin())
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
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
import { typography } from '../../src/theme/typography';
import { FormInput } from '../../src/components/FormInput';
import { FormButton } from '../../src/components/FormButton';
import {
    AtelierSettings,
    DEFAULT_ATELIER_SETTINGS,
    fetchAtelierSettings,
    saveAtelierSettings,
    SettingCurrency,
    SettingDateFormat,
    SettingLanguage,
    validateSettings,
} from '../../src/services/settingsService';

export default function SettingsScreen() {
    const { profile } = useAuth();

    // Estado del formulario
    const [settings, setSettings] = useState<AtelierSettings>(DEFAULT_ATELIER_SETTINGS);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [isDefaultData, setIsDefaultData] = useState<boolean>(false);

    // Estados de notificación y validación
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        setIsLoading(true);
        setErrorMessage(null);
        setSuccessMessage(null);

        const result = await fetchAtelierSettings();
        if (result.error && !result.isDefault) {
            setErrorMessage(result.error);
        }

        setSettings(result.data);
        setIsDefaultData(result.isDefault);
        setIsLoading(false);
    };

    const handleSave = async () => {
        setErrorMessage(null);
        setSuccessMessage(null);

        // Validación local de campos
        const validation = validateSettings(settings);
        if (!validation.isValid) {
            setFieldErrors(validation.errors);
            const firstMsg = Object.values(validation.errors)[0];
            setErrorMessage(firstMsg || 'Por favor corrige los campos indicados.');
            return;
        }

        setFieldErrors({});
        setIsSaving(true);

        const result = await saveAtelierSettings(settings, profile?.id);
        setIsSaving(false);

        if (!result.success) {
            setErrorMessage(result.error || 'No se pudo guardar la configuración.');
        } else {
            if (result.data) {
                setSettings(result.data);
                setIsDefaultData(false);
            }
            setSuccessMessage('Configuración global actualizada exitosamente.');
        }
    };

    return (
        <ScrollView
            style={styles.container}
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar style="dark" />

            {/* Navegación y retorno */}
            <View style={styles.topNavRow}>
                <TouchableOpacity
                    onPress={() => router.replace('/(admin)')}
                    style={styles.backButton}
                    activeOpacity={0.8}
                >
                    <Text style={styles.backButtonText}>← Volver a Usuarios y Roles</Text>
                </TouchableOpacity>

                <View style={styles.badgeContainer}>
                    <Text style={styles.badgeText}>ROL: ADMINISTRADOR</Text>
                </View>
            </View>

            {/* Encabezado Editorial */}
            <View style={styles.header}>
                <Text style={styles.brand}>ATELIER DIGITAL</Text>
                <View style={styles.divider} />
                <Text style={styles.eyebrow}>BY KATHERINE CARROLL</Text>
                <Text style={styles.title}>Configuración Global</Text>
                <Text style={styles.subtitle}>
                    Parámetros institucionales, información de contacto y preferencias regionales del atelier
                </Text>
            </View>

            {/* Banner informativo de tabla o estado */}
            {isDefaultData && !isLoading && (
                <View style={styles.infoBanner}>
                    <Text style={styles.infoText}>
                        ℹ Mostrando valores predeterminados. Para persistir cambios en el servidor, asegúrate de aplicar la migración SQL de configuración en Supabase.
                    </Text>
                </View>
            )}

            {/* Mensajes de éxito y error */}
            {successMessage && (
                <View style={styles.successBanner}>
                    <Text style={styles.successText}>✦ {successMessage}</Text>
                    <TouchableOpacity
                        onPress={() => setSuccessMessage(null)}
                        style={styles.dismissButton}
                    >
                        <Text style={styles.dismissText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {errorMessage && (
                <View style={styles.errorBanner}>
                    <Text style={styles.errorText}>⚠ {errorMessage}</Text>
                    <TouchableOpacity
                        onPress={() => setErrorMessage(null)}
                        style={styles.dismissButton}
                    >
                        <Text style={styles.dismissText}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {isLoading ? (
                <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color={colors.champagneGold} />
                    <Text style={styles.loadingText}>Cargando parámetros globales...</Text>
                </View>
            ) : (
                <View style={styles.formContainer}>
                    {/* SECCIÓN A: DATOS DEL ATELIER */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeaderBlock}>
                            <Text style={styles.sectionEyebrow}>SECCIÓN A</Text>
                            <Text style={styles.sectionTitle}>Datos del Atelier</Text>
                            <Text style={styles.sectionDescription}>
                                Información pública y de correspondencia oficial del atelier
                            </Text>
                        </View>

                        <FormInput
                            label="Nombre comercial"
                            placeholder="Atelier de Autor · By Katherine Carroll"
                            value={settings.commercial_name}
                            onChangeText={(text) => {
                                setSettings((prev: AtelierSettings) => ({ ...prev, commercial_name: text }));
                                if (fieldErrors.commercial_name) {
                                    setFieldErrors((prev: Record<string, string>) => ({ ...prev, commercial_name: '' }));
                                }
                            }}
                            editable={!isSaving}
                            error={fieldErrors.commercial_name}
                        />

                        <FormInput
                            label="Correo electrónico de contacto"
                            placeholder="ej: contacto@bykatherinecarroll.com"
                            value={settings.contact_email}
                            onChangeText={(text) => {
                                setSettings((prev: AtelierSettings) => ({ ...prev, contact_email: text }));
                                if (fieldErrors.contact_email) {
                                    setFieldErrors((prev: Record<string, string>) => ({ ...prev, contact_email: '' }));
                                }
                            }}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            editable={!isSaving}
                            error={fieldErrors.contact_email}
                        />

                        <FormInput
                            label="Teléfono de contacto"
                            placeholder="ej: +57 300 123 4567"
                            value={settings.contact_phone}
                            onChangeText={(text) => {
                                setSettings((prev: AtelierSettings) => ({ ...prev, contact_phone: text }));
                                if (fieldErrors.contact_phone) {
                                    setFieldErrors((prev: Record<string, string>) => ({ ...prev, contact_phone: '' }));
                                }
                            }}
                            keyboardType="phone-pad"
                            autoCapitalize="none"
                            editable={!isSaving}
                            error={fieldErrors.contact_phone}
                        />
                    </View>

                    {/* SECCIÓN B: PREFERENCIAS REGIONALES */}
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionHeaderBlock}>
                            <Text style={styles.sectionEyebrow}>SECCIÓN B</Text>
                            <Text style={styles.sectionTitle}>Preferencias Regionales</Text>
                            <Text style={styles.sectionDescription}>
                                Configuración de idioma, moneda de facturación y visualización de fechas
                            </Text>
                        </View>

                        {/* Selector de Idioma */}
                        <View style={styles.selectorGroup}>
                            <Text style={styles.selectorLabel}>IDIOMA DE LA PLATAFORMA</Text>
                            <View style={styles.optionsRow}>
                                {(
                                    [
                                        { value: 'es', label: 'Español (ES)' },
                                        { value: 'en', label: 'English (EN)' },
                                    ] as const
                                ).map((opt) => {
                                    const isSelected = settings.language === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.value}
                                            onPress={() =>
                                                setSettings((prev: AtelierSettings) => ({
                                                    ...prev,
                                                    language: opt.value as SettingLanguage,
                                                }))
                                            }
                                            style={[
                                                styles.optionButton,
                                                isSelected && styles.optionButtonActive,
                                            ]}
                                            disabled={isSaving}
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionButtonText,
                                                    isSelected && styles.optionButtonTextActive,
                                                ]}
                                            >
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {fieldErrors.language && (
                                <Text style={styles.fieldErrorText}>{fieldErrors.language}</Text>
                            )}
                        </View>

                        {/* Selector de Moneda */}
                        <View style={styles.selectorGroup}>
                            <Text style={styles.selectorLabel}>MONEDA OPERATIVA</Text>
                            <View style={styles.optionsRow}>
                                {(
                                    [
                                        { value: 'COP', label: 'Peso Colombiano (COP $)' },
                                        { value: 'USD', label: 'Dólar Estadounidense (USD $)' },
                                    ] as const
                                ).map((opt) => {
                                    const isSelected = settings.currency === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.value}
                                            onPress={() =>
                                                setSettings((prev: AtelierSettings) => ({
                                                    ...prev,
                                                    currency: opt.value as SettingCurrency,
                                                }))
                                            }
                                            style={[
                                                styles.optionButton,
                                                isSelected && styles.optionButtonActive,
                                            ]}
                                            disabled={isSaving}
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionButtonText,
                                                    isSelected && styles.optionButtonTextActive,
                                                ]}
                                            >
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {fieldErrors.currency && (
                                <Text style={styles.fieldErrorText}>{fieldErrors.currency}</Text>
                            )}
                        </View>

                        {/* Selector de Formato de Fecha */}
                        <View style={styles.selectorGroup}>
                            <Text style={styles.selectorLabel}>FORMATO DE FECHA</Text>
                            <View style={styles.optionsRow}>
                                {(
                                    [
                                        { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY (Estándar)' },
                                        { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD (ISO)' },
                                        { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY (EE.UU.)' },
                                    ] as const
                                ).map((opt) => {
                                    const isSelected = settings.date_format === opt.value;
                                    return (
                                        <TouchableOpacity
                                            key={opt.value}
                                            onPress={() =>
                                                setSettings((prev: AtelierSettings) => ({
                                                    ...prev,
                                                    date_format: opt.value as SettingDateFormat,
                                                }))
                                            }
                                            style={[
                                                styles.optionButton,
                                                isSelected && styles.optionButtonActive,
                                            ]}
                                            disabled={isSaving}
                                            activeOpacity={0.8}
                                        >
                                            <Text
                                                style={[
                                                    styles.optionButtonText,
                                                    isSelected && styles.optionButtonTextActive,
                                                ]}
                                            >
                                                {opt.label}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {fieldErrors.date_format && (
                                <Text style={styles.fieldErrorText}>{fieldErrors.date_format}</Text>
                            )}
                        </View>
                    </View>

                    {/* SECCIÓN C: CONTROL DE ACCESO Y SEGURIDAD */}
                    <View style={styles.securityNoticeCard}>
                        <View style={styles.securityBadge}>
                            <Text style={styles.securityBadgeText}>PROTECCIÓN RLS DE SUPABASE</Text>
                        </View>
                        <Text style={styles.securityTitle}>Acceso Restringido a Administradores</Text>
                        <Text style={styles.securityText}>
                            La lectura y modificación de estos parámetros se valida en el motor PostgreSQL mediante la función de seguridad public.is_admin(). Los usuarios sin rol de administración tienen el acceso revocado a nivel de base de datos.
                        </Text>
                    </View>

                    {/* BOTÓN DE GUARDADO */}
                    <View style={styles.actionContainer}>
                        <FormButton
                            title="Guardar Configuración Global"
                            onPress={handleSave}
                            variant="primary"
                            loading={isSaving}
                        />
                    </View>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.ivoryWarm,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: 40,
        paddingBottom: 60,
        maxWidth: 900,
        width: '100%',
        alignSelf: 'center',
    },
    topNavRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    backButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 2,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
    },
    backButtonText: {
        color: colors.atelierBlack,
        fontFamily: typography.sans,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.8,
    },
    badgeContainer: {
        paddingHorizontal: 10,
        paddingVertical: 5,
        backgroundColor: '#FCFAF7',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 2,
    },
    badgeText: {
        fontSize: 10,
        letterSpacing: 1.5,
        fontWeight: '700',
        color: colors.champagneGold,
        fontFamily: typography.sans,
    },
    header: {
        alignItems: 'center',
        marginBottom: 28,
    },
    brand: {
        color: colors.champagneGold,
        fontFamily: typography.sans,
        fontSize: 12,
        letterSpacing: 3,
        fontWeight: '600',
    },
    divider: {
        width: 32,
        height: 1,
        backgroundColor: colors.champagneGold,
        marginVertical: 10,
    },
    eyebrow: {
        color: colors.textSecondary,
        fontFamily: typography.sans,
        fontSize: 11,
        letterSpacing: 2,
        marginBottom: 6,
    },
    title: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 28,
        fontWeight: '400',
        letterSpacing: 0.5,
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        color: colors.textSecondary,
        fontFamily: typography.sans,
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        maxWidth: 580,
    },
    infoBanner: {
        backgroundColor: '#F5EFE6',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        padding: 14,
        borderRadius: 2,
        marginBottom: 20,
    },
    infoText: {
        color: colors.atelierBlack,
        fontFamily: typography.sans,
        fontSize: 12,
        lineHeight: 18,
    },
    successBanner: {
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
        borderWidth: 1,
        padding: 14,
        borderRadius: 2,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    successText: {
        color: colors.success,
        fontFamily: typography.sans,
        fontSize: 13,
        flex: 1,
    },
    errorBanner: {
        backgroundColor: colors.errorBg,
        borderColor: colors.errorBorder,
        borderWidth: 1,
        padding: 14,
        borderRadius: 2,
        marginBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    errorText: {
        color: colors.error,
        fontFamily: typography.sans,
        fontSize: 13,
        flex: 1,
    },
    dismissButton: {
        paddingLeft: 12,
    },
    dismissText: {
        fontSize: 14,
        color: colors.textSecondary,
    },
    loadingBox: {
        paddingVertical: 60,
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 14,
        color: colors.textSecondary,
        fontFamily: typography.sans,
        fontSize: 13,
    },
    formContainer: {
        gap: 24,
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 2,
        padding: 24,
    },
    sectionHeaderBlock: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F4ECE1',
        paddingBottom: 14,
    },
    sectionEyebrow: {
        color: colors.champagneGold,
        fontFamily: typography.sans,
        fontSize: 10,
        letterSpacing: 2,
        fontWeight: '700',
        marginBottom: 4,
    },
    sectionTitle: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 20,
        letterSpacing: 0.3,
        marginBottom: 4,
    },
    sectionDescription: {
        color: colors.textSecondary,
        fontFamily: typography.sans,
        fontSize: 12,
        lineHeight: 18,
    },
    selectorGroup: {
        marginBottom: 20,
    },
    selectorLabel: {
        color: colors.atelierBlack,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        fontFamily: typography.sans,
        marginBottom: 8,
    },
    optionsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    optionButton: {
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 2,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FCFAF7',
    },
    optionButtonActive: {
        borderColor: colors.champagneGold,
        backgroundColor: colors.atelierBlack,
    },
    optionButtonText: {
        fontSize: 12,
        fontFamily: typography.sans,
        color: colors.atelierBlack,
        fontWeight: '500',
    },
    optionButtonTextActive: {
        color: colors.ivoryWarm,
        fontWeight: '600',
    },
    fieldErrorText: {
        color: colors.error,
        fontSize: 12,
        marginTop: 6,
        fontFamily: typography.sans,
    },
    securityNoticeCard: {
        backgroundColor: '#FCFAF7',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 2,
        padding: 20,
    },
    securityBadge: {
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 4,
        backgroundColor: '#EDE5D8',
        borderRadius: 2,
        marginBottom: 8,
    },
    securityBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.5,
        color: colors.atelierBlack,
        fontFamily: typography.sans,
    },
    securityTitle: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 16,
        marginBottom: 6,
    },
    securityText: {
        color: colors.textSecondary,
        fontFamily: typography.sans,
        fontSize: 12,
        lineHeight: 18,
    },
    actionContainer: {
        marginTop: 10,
        marginBottom: 20,
    },
});
