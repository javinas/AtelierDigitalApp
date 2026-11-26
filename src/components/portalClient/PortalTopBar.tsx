// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: BARRA SUPERIOR DEL PORTAL DE CLIENTA (M09 P1.1)
// Archivo: src/components/portalClient/PortalTopBar.tsx
// ==============================================================================

import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { PortalResponsiveMetrics } from '../../types/portal';

export interface PortalTopBarProps {
    responsive: PortalResponsiveMetrics;
    onExploreAtelier: () => void;
    onSignOut: () => void;
    backLabel?: string;
    onBack?: () => void;
}

export const PortalTopBar: React.FC<PortalTopBarProps> = ({
    responsive,
    onExploreAtelier,
    onSignOut,
    backLabel,
    onBack,
}) => {
    return (
        <View
            style={[
                styles.topBar,
                {
                    paddingHorizontal: responsive.horizontalPadding,
                },
            ]}
        >
            <View
                style={[
                    styles.topBarInner,
                    {
                        maxWidth: responsive.contentMaxWidth,
                    },
                    responsive.isMobile && styles.topBarInnerMobile,
                ]}
            >
                <View style={styles.brandBlock}>
                    {onBack && (
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={onBack}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.backButtonText}>
                                ← {backLabel || 'Volver a mi dossier'}
                            </Text>
                        </TouchableOpacity>
                    )}
                    <Text style={styles.brandTitle}>ATELIER DIGITAL</Text>
                    <Text style={styles.brandSubtitle}>
                        Espacio de Clienta · By Katherine Carroll
                    </Text>
                </View>

                <View
                    style={[
                        styles.topBarActions,
                        responsive.isMobile && styles.topBarActionsMobile,
                    ]}
                >
                    <TouchableOpacity
                        style={styles.publicHomeButton}
                        onPress={onExploreAtelier}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.publicHomeButtonText}>Explorar Atelier</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={styles.signOutButton}
                        onPress={onSignOut}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.signOutButtonText}>Cerrar Sesión</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    topBar: {
        paddingTop: Platform.select({ ios: 52, android: 44, default: 28 }),
        paddingBottom: 18,
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    topBarInner: {
        width: '100%',
        alignSelf: 'center',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 12,
    },
    topBarInnerMobile: {
        alignItems: 'flex-start',
    },
    brandBlock: {
        flexShrink: 1,
    },
    backButton: {
        alignSelf: 'flex-start',
        marginBottom: 6,
    },
    backButtonText: {
        color: colors.accentDark,
        fontSize: 12,
        fontWeight: '600',
        fontFamily: typography.sans,
    },
    brandTitle: {
        color: colors.accent,
        fontSize: 14,
        letterSpacing: 3,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    brandSubtitle: {
        color: colors.textSecondary,
        fontSize: 12,
        marginTop: 2,
        fontFamily: typography.sans,
    },
    topBarActions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
    },
    topBarActionsMobile: {
        width: '100%',
        justifyContent: 'flex-start',
    },
    publicHomeButton: {
        borderWidth: 1,
        borderColor: colors.accent,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 7,
    },
    publicHomeButtonText: {
        color: colors.accentDark,
        fontSize: 12,
        fontWeight: '600',
    },
    signOutButton: {
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 4,
        paddingHorizontal: 12,
        paddingVertical: 7,
        backgroundColor: colors.surfaceSubtle,
    },
    signOutButtonText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: '500',
    },
});
