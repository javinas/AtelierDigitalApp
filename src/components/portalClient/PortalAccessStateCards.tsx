// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: ESTADOS Y ALERTAS DEL PORTAL (M09 P1.1)
// Archivo: src/components/portalClient/PortalAccessStateCards.tsx
// ==============================================================================

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { PortalResponsiveMetrics } from '../../types/portal';

export const PortalDemoModeBanner: React.FC = () => (
    <View style={styles.demoBanner}>
        <View style={styles.demoBannerHeader}>
            <Text style={styles.demoBannerIcon}>✦</Text>
            <Text style={styles.demoBannerTitle}>
                MODO DEMO · VISTAS CANÓNICAS NO DISPONIBLES
            </Text>
        </View>
        <Text style={styles.demoBannerText}>
            El backend seguro del portal (M09-A v2.10) aún no está disponible en este entorno. Por protección Zero Trust no se muestran datos simulados ni se registra telemetría ficticia en memoria local.
        </Text>
    </View>
);

export interface PortalErrorBannerProps {
    message: string;
    retryLabel: string;
    onRetry: () => void;
}

export const PortalErrorBanner: React.FC<PortalErrorBannerProps> = ({
    message,
    retryLabel,
    onRetry,
}) => (
    <View style={styles.errorBox}>
        <Text style={styles.errorText}>✦ {message}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryButtonText}>{retryLabel}</Text>
        </TouchableOpacity>
    </View>
);

export type PortalAccessBlockedVariant = 'restricted' | 'pending_activation' | 'unlinked';

export interface PortalAccessRestrictedCardProps {
    variant: PortalAccessBlockedVariant;
    responsive: PortalResponsiveMetrics;
    onContactAtelier: () => void;
}

const RESTRICTED_COPY: Record<
    PortalAccessBlockedVariant,
    { icon: string; title: string; body: string; cta: string }
> = {
    restricted: {
        icon: '🔒',
        title: 'Acceso al Portal Restringido',
        body: 'Tu acceso a las vistas interactivas del atelier ha sido pausado o revocado según las políticas de privacidad del taller. Para reactivar tu dossier digital, comunícate directamente con Katherine Carroll.',
        cta: 'CONTACTAR A KATHERINE CARROLL →',
    },
    pending_activation: {
        icon: '✦',
        title: 'Confirmación de Invitación Pendiente',
        body: 'Tu vínculo al Portal de Clientas se encuentra en estado invitado. Por política Zero Trust, ninguna creación, medida, cotización o cita se libera hasta completar la aceptación segura desde el enlace enviado por Katherine Carroll.',
        cta: 'SOLICITAR ASISTENCIA AL ATELIER →',
    },
    unlinked: {
        icon: '✧',
        title: 'Portal Privado sin Vinculación Activa',
        body: 'Esta cuenta aún no dispone de un acceso activo al Portal de Clientas. Si recibiste una invitación privada, ábrela desde el enlace oficial compartido por tu diseñadora.',
        cta: 'CONTACTAR A KATHERINE CARROLL →',
    },
};

export const PortalAccessRestrictedCard: React.FC<PortalAccessRestrictedCardProps> = ({
    variant,
    responsive,
    onContactAtelier,
}) => {
    const copy = RESTRICTED_COPY[variant];
    return (
        <View style={[styles.restrictedCard, { padding: responsive.cardPadding }]}>
            <Text style={styles.restrictedIcon}>{copy.icon}</Text>
            <Text style={styles.restrictedTitle}>{copy.title}</Text>
            <Text style={styles.restrictedText}>{copy.body}</Text>
            <TouchableOpacity
                style={styles.contactAtelierButton}
                onPress={onContactAtelier}
                activeOpacity={0.85}
            >
                <Text style={styles.contactAtelierButtonText}>{copy.cta}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    demoBanner: {
        backgroundColor: '#FFF8E7',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 6,
        padding: 16,
        marginBottom: 20,
    },
    demoBannerHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 6,
    },
    demoBannerIcon: {
        color: colors.champagneGold,
        fontSize: 13,
        fontWeight: '700',
    },
    demoBannerTitle: {
        color: '#6E4D1A',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.5,
        flexShrink: 1,
    },
    demoBannerText: {
        color: '#5C4418',
        fontSize: 12,
        lineHeight: 18,
    },
    errorBox: {
        backgroundColor: colors.errorBg,
        borderWidth: 1,
        borderColor: colors.errorBorder,
        borderRadius: 6,
        padding: 16,
        marginBottom: 20,
        gap: 10,
    },
    errorText: {
        color: colors.error,
        fontSize: 12.5,
        lineHeight: 18,
    },
    retryButton: {
        alignSelf: 'flex-start',
        backgroundColor: colors.error,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    retryButtonText: {
        color: '#FFFFFF',
        fontSize: 11.5,
        fontWeight: '600',
    },
    restrictedCard: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    restrictedIcon: {
        fontSize: 32,
        marginBottom: 12,
    },
    restrictedTitle: {
        color: colors.textPrimary,
        fontSize: 18,
        fontWeight: '600',
        fontFamily: typography.serif,
        marginBottom: 8,
        textAlign: 'center',
    },
    restrictedText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        marginBottom: 20,
        maxWidth: 580,
    },
    contactAtelierButton: {
        backgroundColor: colors.atelierBlack,
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    contactAtelierButtonText: {
        color: colors.ivoryWarm,
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        textAlign: 'center',
    },
});
