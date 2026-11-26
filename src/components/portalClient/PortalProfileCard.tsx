// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: TARJETA DE IDENTIDAD Y BIENVENIDA (M09 P1.1)
// Archivo: src/components/portalClient/PortalProfileCard.tsx
// ==============================================================================

import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { ClientPortalAccess, PortalResponsiveMetrics } from '../../types/portal';

export interface PortalProfileCardProps {
    access: ClientPortalAccess | null;
    displayName: string;
    displayEmail: string;
    displayCity: string | null;
    responsive: PortalResponsiveMetrics;
}

export const PortalProfileCard: React.FC<PortalProfileCardProps> = ({
    access,
    displayName,
    displayEmail,
    displayCity,
    responsive,
}) => {
    return (
        <View style={[styles.welcomeCard, { padding: responsive.cardPadding }]}>
            <View style={styles.welcomeHeaderRow}>
                <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeText}>CLIENTA AUTENTICADA</Text>
                </View>
                {access && (
                    <View
                        style={[
                            styles.statusPill,
                            access.status === 'active' && styles.statusPillActive,
                            access.status === 'invited' && styles.statusPillInvited,
                            access.status === 'suspended' && styles.statusPillSuspended,
                            access.status === 'revoked' && styles.statusPillRevoked,
                        ]}
                    >
                        <Text
                            style={[
                                styles.statusPillText,
                                access.status === 'active' && styles.statusPillTextActive,
                                access.status === 'invited' && styles.statusPillTextInvited,
                                access.status === 'suspended' && styles.statusPillTextSuspended,
                                access.status === 'revoked' && styles.statusPillTextRevoked,
                            ]}
                        >
                            {access.status === 'active' && 'ACTIVA'}
                            {access.status === 'invited' && 'INVITADA · CONFIRMACIÓN PENDIENTE'}
                            {access.status === 'suspended' && 'SUSPENDIDA TEMPORALMENTE'}
                            {access.status === 'revoked' && 'ACCESO REVOCADO'}
                        </Text>
                    </View>
                )}
            </View>

            <Text
                style={[
                    styles.greetingTitle,
                    responsive.isMobile && styles.greetingTitleMobile,
                ]}
            >
                Bienvenida, {displayName}
            </Text>
            {(displayEmail || displayCity) && (
                <Text style={styles.greetingSubtitle}>
                    {displayEmail}
                    {displayEmail && displayCity ? ' · ' : ''}
                    {displayCity || ''}
                </Text>
            )}

            <View style={styles.divider} />

            <Text style={styles.sessionInfoText}>
                Canal cifrado bajo aislamiento estricto por fila (RLS) y vistas protegidas. Solo se despliega información autorizada explícitamente para tu cuenta.
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    welcomeCard: {
        backgroundColor: colors.surface,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.border,
        padding: 24,
        marginBottom: 20,
        shadowColor: '#29231F',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    welcomeHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8,
    },
    roleBadge: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    roleBadgeText: {
        color: colors.ivoryWarm,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
    },
    statusPill: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        borderWidth: 1,
    },
    statusPillActive: {
        backgroundColor: colors.successBg,
        borderColor: colors.successBorder,
    },
    statusPillInvited: {
        backgroundColor: '#FFF8E7',
        borderColor: colors.champagneGold,
    },
    statusPillSuspended: {
        backgroundColor: '#F7EDDA',
        borderColor: '#C79D58',
    },
    statusPillRevoked: {
        backgroundColor: colors.errorBg,
        borderColor: colors.errorBorder,
    },
    statusPillText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    statusPillTextActive: {
        color: colors.success,
    },
    statusPillTextInvited: {
        color: '#7A5B20',
    },
    statusPillTextSuspended: {
        color: '#6E4D1A',
    },
    statusPillTextRevoked: {
        color: colors.error,
    },
    greetingTitle: {
        color: colors.textPrimary,
        fontSize: 22,
        fontWeight: '600',
        fontFamily: typography.serif,
        marginBottom: 4,
    },
    greetingTitleMobile: {
        fontSize: 20,
    },
    greetingSubtitle: {
        color: colors.textSecondary,
        fontSize: 13,
        marginBottom: 12,
    },
    divider: {
        height: 1,
        backgroundColor: colors.line,
        marginVertical: 12,
        width: 48,
    },
    sessionInfoText: {
        color: colors.textMuted,
        fontSize: 12,
        lineHeight: 18,
    },
});
