import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import { LEGAL_DOCUMENT_VERSIONS, LEGAL_ENTITY_INFO } from '../constants/legalDocuments';

interface PrivacyNoticeBannerProps {
    compact?: boolean;
    contextLabel?: string;
}

/**
 * Aviso de Privacidad breve y visible para formularios de registro y contacto,
 * conforme a la Ley 1581 de 2012 y el Decreto 1074 de 2015 (Colombia).
 */
export function PrivacyNoticeBanner({
    compact = false,
    contextLabel = 'AVISO DE PRIVACIDAD · LEY 1581 DE 2012',
}: PrivacyNoticeBannerProps) {
    return (
        <View style={[styles.bannerContainer, compact && styles.bannerContainerCompact]}>
            <View style={styles.headerRow}>
                <Text style={styles.eyebrow}>{contextLabel}</Text>
                <Text style={styles.versionTag}>v{LEGAL_DOCUMENT_VERSIONS.PRIVACY_NOTICE}</Text>
            </View>

            <Text style={styles.bodyText}>
                <Text style={styles.boldText}>{LEGAL_ENTITY_INFO.brandName}</Text> (con domicilio en{' '}
                {LEGAL_ENTITY_INFO.cityCountry}) actúa como Responsable del Tratamiento de los datos
                personales solicitados en este formulario (identificación, contacto y, cuando aplique
                en el expediente de confección, medidas antropométricas y registros de prendas), con la
                finalidad de gestionar su cuenta de clienta, atender consultas, elaborar propuestas de
                alta costura a medida y brindar seguimiento personalizado.
            </Text>

            {!compact && (
                <Text style={styles.bodyTextSecondary}>
                    Como titular, usted tiene derecho a conocer, actualizar, rectificar y suprimir sus
                    datos, así como a revocar su autorización y presentar consultas o reclamos a través
                    de nuestros canales oficiales. Es facultativo responder preguntas sobre datos
                    sensibles o de menores de edad.
                </Text>
            )}

            <View style={styles.linksRow}>
                <TouchableOpacity
                    onPress={() => router.push('/aviso-privacidad' as any)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.linkText}>Ver Aviso de Privacidad</Text>
                </TouchableOpacity>
                <Text style={styles.bullet}>·</Text>
                <TouchableOpacity
                    onPress={() => router.push('/politica-privacidad' as any)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.linkText}>Política de Tratamiento de Datos</Text>
                </TouchableOpacity>
                <Text style={styles.bullet}>·</Text>
                <TouchableOpacity
                    onPress={() => router.push('/terminos-condiciones' as any)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.linkText}>Términos de Uso</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

interface LegalConsentCheckboxProps {
    checked: boolean;
    onToggle: () => void;
    required?: boolean;
    disabled?: boolean;
    children: React.ReactNode;
    testID?: string;
}

/**
 * Casilla de verificación (checkbox) de estética editorial para consentimientos
 * granulares en registro y formularios. Nunca viene premarcada por defecto.
 */
export function LegalConsentCheckbox({
    checked,
    onToggle,
    required = false,
    disabled = false,
    children,
    testID,
}: LegalConsentCheckboxProps) {
    return (
        <View style={styles.checkboxRow}>
            <TouchableOpacity
                onPress={onToggle}
                disabled={disabled}
                activeOpacity={0.75}
                accessibilityRole="checkbox"
                accessibilityState={{ checked, disabled }}
                testID={testID}
                style={[
                    styles.checkboxBox,
                    checked && styles.checkboxBoxChecked,
                    disabled && styles.checkboxBoxDisabled,
                ]}
            >
                {checked && <Text style={styles.checkmark}>✓</Text>}
            </TouchableOpacity>

            <View style={styles.checkboxLabelContainer}>
                <Text style={styles.checkboxText}>
                    {children}
                    {required ? (
                        <Text style={styles.requiredBadge}> (Obligatorio *)</Text>
                    ) : (
                        <Text style={styles.optionalBadge}> (Opcional)</Text>
                    )}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    bannerContainer: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.sand,
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
        borderRadius: 3,
        padding: 14,
        marginBottom: 16,
    },
    bannerContainerCompact: {
        padding: 12,
        marginBottom: 14,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    eyebrow: {
        color: colors.champagneGold,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.5,
        fontFamily: typography.sans,
    },
    versionTag: {
        color: colors.textMuted,
        fontSize: 9.5,
        fontWeight: '600',
        fontFamily: typography.sans,
    },
    bodyText: {
        color: colors.textSecondary,
        fontSize: 11.5,
        lineHeight: 17,
        fontFamily: typography.sans,
        marginBottom: 6,
    },
    bodyTextSecondary: {
        color: colors.textSecondary,
        fontSize: 11,
        lineHeight: 16,
        fontFamily: typography.sans,
        marginBottom: 8,
    },
    boldText: {
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    linksRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 6,
        marginTop: 4,
    },
    linkText: {
        color: colors.bronze,
        fontSize: 11,
        fontWeight: '600',
        textDecorationLine: 'underline',
        fontFamily: typography.sans,
    },
    bullet: {
        color: colors.champagneGold,
        fontSize: 11,
    },

    /* Checkbox Styles */
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 10,
    },
    checkboxBox: {
        width: 20,
        height: 20,
        borderRadius: 3,
        borderWidth: 1.5,
        borderColor: colors.bronze,
        backgroundColor: '#FFFFFF',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 1,
    },
    checkboxBoxChecked: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.champagneGold,
    },
    checkboxBoxDisabled: {
        opacity: 0.5,
    },
    checkmark: {
        color: colors.champagneGold,
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 14,
    },
    checkboxLabelContainer: {
        flex: 1,
    },
    checkboxText: {
        color: colors.textPrimary,
        fontSize: 12,
        lineHeight: 18,
        fontFamily: typography.sans,
    },
    requiredBadge: {
        color: colors.bronze,
        fontSize: 10.5,
        fontWeight: '600',
    },
    optionalBadge: {
        color: colors.textMuted,
        fontSize: 10.5,
        fontStyle: 'italic',
    },
});

