// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: NAVEGACIÓN MODULAR DEL PORTAL (M09 P1.3)
// Archivo: src/components/portalClient/PortalSectionNav.tsx
// ==============================================================================

import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { PortalResponsiveMetrics } from '../../types/portal';
import { PortalSectionKey, PortalSectionNavItem } from '../../utils/portalCreationProgress';

export interface PortalSectionNavProps {
    sections: PortalSectionNavItem[];
    activeSection: PortalSectionKey;
    onSelectSection: (section: PortalSectionKey) => void;
    responsive: PortalResponsiveMetrics;
}

export const PortalSectionNav: React.FC<PortalSectionNavProps> = ({
    sections,
    activeSection,
    onSelectSection,
    responsive,
}) => {
    // Si solo hay 0 o 1 módulo autorizado (ej. únicamente Creaciones), no recargar la vista
    if (sections.length <= 1) {
        return null;
    }

    const renderPill = (item: PortalSectionNavItem) => {
        const isActive = activeSection === item.key;
        return (
            <TouchableOpacity
                key={item.key}
                style={[styles.pill, isActive && styles.pillActive]}
                onPress={() => onSelectSection(item.key)}
                activeOpacity={0.8}
                accessibilityRole="tab"
                accessibilityState={{ selected: isActive }}
            >
                <Text style={[styles.pillText, isActive && styles.pillTextActive]}>
                    {item.label}
                </Text>
                {typeof item.count === 'number' && (
                    <View style={[styles.countChip, isActive && styles.countChipActive]}>
                        <Text
                            style={[styles.countChipText, isActive && styles.countChipTextActive]}
                        >
                            {item.count}
                        </Text>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    if (responsive.isMobile) {
        return (
            <View style={styles.navContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.horizontalRow}
                >
                    {sections.map(renderPill)}
                </ScrollView>
            </View>
        );
    }

    return (
        <View style={styles.navContainer}>
            <View style={styles.wrapRow}>{sections.map(renderPill)}</View>
        </View>
    );
};

const styles = StyleSheet.create({
    navContainer: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: 12,
    },
    horizontalRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingRight: 8,
    },
    wrapRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 10,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    pillActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.champagneGold,
    },
    pillText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
        fontFamily: typography.sans,
        letterSpacing: 0.4,
    },
    pillTextActive: {
        color: colors.ivoryWarm,
    },
    countChip: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 1,
        minWidth: 20,
        alignItems: 'center',
    },
    countChipActive: {
        backgroundColor: colors.champagneGold,
    },
    countChipText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    countChipTextActive: {
        color: colors.atelierBlack,
    },
});
