import React from 'react';
import {
    ActivityIndicator,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    ViewStyle,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface FormButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'secondary' | 'ghost' | 'champagne';
    loading?: boolean;
    disabled?: boolean;
    style?: StyleProp<ViewStyle>;
}

export function FormButton({
    title,
    onPress,
    variant = 'primary',
    loading = false,
    disabled = false,
    style,
}: FormButtonProps) {
    const isPrimary = variant === 'primary';
    const isSecondary = variant === 'secondary';
    const isGhost = variant === 'ghost';
    const isChampagne = variant === 'champagne';

    return (
        <TouchableOpacity
            style={[
                styles.baseButton,
                isPrimary && styles.primaryButton,
                isSecondary && styles.secondaryButton,
                isChampagne && styles.champagneButton,
                isGhost && styles.ghostButton,
                (disabled || loading) && styles.disabledButton,
                style,
            ]}
            onPress={onPress}
            disabled={disabled || loading}
            activeOpacity={0.85}
        >
            {loading ? (
                <ActivityIndicator
                    color={
                        isPrimary
                            ? colors.champagneGold
                            : isChampagne
                            ? colors.atelierBlack
                            : colors.atelierBlack
                    }
                    size="small"
                />
            ) : (
                <Text
                    style={[
                        styles.baseText,
                        isPrimary && styles.primaryText,
                        isSecondary && styles.secondaryText,
                        isChampagne && styles.champagneText,
                        isGhost && styles.ghostText,
                    ]}
                >
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    baseButton: {
        minHeight: 50,
        borderRadius: 2,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingVertical: 14,
        width: '100%',
    },
    primaryButton: {
        backgroundColor: colors.atelierBlack,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    secondaryButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: colors.atelierBlack,
    },
    champagneButton: {
        backgroundColor: colors.champagneGold,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    ghostButton: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        minHeight: 38,
        paddingVertical: 8,
    },
    disabledButton: {
        opacity: 0.55,
    },
    baseText: {
        fontSize: 12,
        letterSpacing: 2.2,
        fontWeight: '600',
        textTransform: 'uppercase',
        fontFamily: typography.sans,
    },
    primaryText: {
        color: colors.ivoryWarm,
    },
    secondaryText: {
        color: colors.atelierBlack,
    },
    champagneText: {
        color: colors.atelierBlack,
    },
    ghostText: {
        color: colors.textSecondary,
        textTransform: 'none',
        letterSpacing: 0.5,
        fontSize: 13,
    },
});
