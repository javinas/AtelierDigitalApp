// ==============================================================================
// SELECTOR ELEGANTE DE IDIOMA (ES / EN)
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../theme/colors';
import { useLandingLanguage } from '../context/LandingLanguageContext';

interface LanguageSelectorProps {
    compact?: boolean;
}

export function LanguageSelector({ compact = false }: LanguageSelectorProps) {
    const { language, setLanguage } = useLandingLanguage();

    return (
        <View style={[styles.container, compact && styles.containerCompact]}>
            <TouchableOpacity
                onPress={() => setLanguage('es')}
                style={[
                    styles.optionBtn,
                    compact && styles.optionBtnCompact,
                    language === 'es' && styles.optionBtnActive,
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Cambiar idioma a Español"
                accessibilityState={{ selected: language === 'es' }}
            >
                <Text
                    style={[
                        styles.optionText,
                        compact && styles.optionTextCompact,
                        language === 'es' && styles.optionTextActive,
                    ]}
                >
                    ES
                </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
                onPress={() => setLanguage('en')}
                style={[
                    styles.optionBtn,
                    compact && styles.optionBtnCompact,
                    language === 'en' && styles.optionBtnActive,
                ]}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel="Switch language to English"
                accessibilityState={{ selected: language === 'en' }}
            >
                <Text
                    style={[
                        styles.optionText,
                        compact && styles.optionTextCompact,
                        language === 'en' && styles.optionTextActive,
                    ]}
                >
                    EN
                </Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(23, 20, 17, 0.85)',
        borderWidth: 1,
        borderColor: 'rgba(197, 168, 128, 0.4)',
        borderRadius: 14,
        padding: 2,
    },
    containerCompact: {
        borderRadius: 12,
        padding: 1.5,
    },
    divider: {
        width: 1,
        height: 12,
        backgroundColor: 'rgba(197, 168, 128, 0.25)',
        marginHorizontal: 1,
    },
    optionBtn: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    optionBtnCompact: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 9,
    },
    optionBtnActive: {
        backgroundColor: colors.champagneGold,
        shadowColor: colors.champagneGold,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    optionText: {
        fontSize: 10,
        fontWeight: '600',
        color: 'rgba(245, 239, 230, 0.75)',
        letterSpacing: 0.8,
    },
    optionTextCompact: {
        fontSize: 9,
    },
    optionTextActive: {
        color: '#171411',
        fontWeight: '800',
    },
});

export default LanguageSelector;

