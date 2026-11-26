// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: TARJETA LEGAL Y DERECHOS ARCO (M09 P1.1)
// Archivo: src/components/portalClient/PortalLegalCard.tsx
// ==============================================================================

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LEGAL_DOCUMENT_VERSIONS } from '../../constants/legalDocuments';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { PortalResponsiveMetrics } from '../../types/portal';

export interface PortalLegalCardProps {
    responsive: PortalResponsiveMetrics;
    onOpenLegalRoute: (routePath: string) => void;
    onOpenArcoRequest: () => void;
}

const LEGAL_PILLS: readonly { label: string; route: string }[] = [
    { label: 'Política de Privacidad', route: '/politica-privacidad' },
    { label: 'Términos de Uso', route: '/terminos-condiciones' },
    { label: 'Aviso de Privacidad', route: '/aviso-privacidad' },
    { label: 'Política de Cookies', route: '/politica-cookies' },
    { label: 'Transparencia IA', route: '/ia-transparencia' },
];

export const PortalLegalCard: React.FC<PortalLegalCardProps> = ({
    responsive,
    onOpenLegalRoute,
    onOpenArcoRequest,
}) => {
    return (
        <View style={[styles.legalCard, { padding: responsive.cardPadding }]}>
            <View style={styles.legalHeaderRow}>
                <Text style={styles.legalEyebrow}>
                    PRIVACIDAD, HABEAS DATA & TRANSPARENCIA · LEY 1581 DE 2012
                </Text>
                <Text style={styles.legalVersionBadge}>
                    v{LEGAL_DOCUMENT_VERSIONS.PRIVACY_POLICY}
                </Text>
            </View>

            <Text style={styles.legalTitle}>Custodia de tus Datos y Derechos de Titular</Text>
            <Text style={styles.legalText}>
                Tus datos de contacto, historial de medidas y registros de confección se encuentran protegidos bajo políticas de seguridad por fila (Row Level Security). En cualquier momento puedes ejercer tus derechos a conocer, actualizar, rectificar o solicitar la supresión de tus datos.
            </Text>

            <View style={styles.legalPillsRow}>
                {LEGAL_PILLS.map((pill) => (
                    <TouchableOpacity
                        key={pill.route}
                        style={styles.legalPill}
                        onPress={() => onOpenLegalRoute(pill.route)}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.legalPillText}>{pill.label}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                style={styles.arcoActionButton}
                onPress={onOpenArcoRequest}
                activeOpacity={0.85}
            >
                <Text style={styles.arcoActionButtonText}>
                    RADICAR CONSULTA, RECTIFICACIÓN O SOLICITUD SOBRE MIS DATOS →
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    legalCard: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 6,
        padding: 24,
        marginTop: 10,
    },
    legalHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    legalEyebrow: {
        color: colors.accent,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.5,
        flexShrink: 1,
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
        fontFamily: typography.serif,
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
        paddingVertical: 12,
        paddingHorizontal: 16,
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
