import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface AtelierBrandBadgeProps {
    compact?: boolean;
    subtitle?: string;
}

export function AtelierBrandBadge({
    compact = false,
    subtitle = 'Alta Costura · Edición de Autor',
}: AtelierBrandBadgeProps) {
    return (
        <View style={[styles.container, compact && styles.containerCompact]}>
            {/* Placa negra de alta costura con el logotipo original By Katherine Carroll */}
            <View style={[styles.logoCard, compact && styles.logoCardCompact]}>
                <Image
                    source={require('../../assets/logo_transparent.png')}
                    style={[styles.logoImage, compact && styles.logoImageCompact]}
                    resizeMode="contain"
                />
            </View>

            <View style={styles.textContainer}>
                <Text style={styles.brandTitle}>ATELIER DIGITAL</Text>
                {subtitle ? (
                    <Text style={styles.brandSubtitle}>{subtitle}</Text>
                ) : null}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        marginBottom: 24,
    },
    containerCompact: {
        marginBottom: 16,
    },
    logoCard: {
        backgroundColor: colors.atelierBlack,
        borderRadius: 4,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: colors.atelierBlack,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    logoCardCompact: {
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    logoImage: {
        width: 170,
        height: 48,
    },
    logoImageCompact: {
        width: 120,
        height: 34,
    },
    textContainer: {
        alignItems: 'center',
        marginTop: 12,
    },
    brandTitle: {
        color: colors.champagneGold,
        fontSize: 11,
        letterSpacing: 4,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    brandSubtitle: {
        color: colors.textSecondary,
        fontSize: 12,
        letterSpacing: 1.2,
        marginTop: 4,
        fontFamily: typography.sans,
    },
});
