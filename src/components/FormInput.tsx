import React, { useState } from 'react';
import {
    KeyboardTypeOptions,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    View,
} from 'react-native';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

interface FormInputProps {
    label: string;
    placeholder?: string;
    value: string;
    onChangeText: (text: string) => void;
    secureTextEntry?: boolean;
    keyboardType?: KeyboardTypeOptions;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    editable?: boolean;
    rightAccessory?: React.ReactNode;
    error?: string | null;
    multiline?: boolean;
    numberOfLines?: number;
}

export function FormInput({
    label,
    placeholder,
    value,
    onChangeText,
    secureTextEntry = false,
    keyboardType = 'default',
    autoCapitalize = 'none',
    editable = true,
    rightAccessory,
    error,
    multiline = false,
    numberOfLines,
}: FormInputProps) {
    const [isFocused, setIsFocused] = useState(false);

    return (
        <View style={styles.container}>
            <View style={styles.labelRow}>
                <Text style={styles.label}>{label}</Text>
                {rightAccessory}
            </View>

            <TextInput
                style={[
                    styles.input,
                    multiline && styles.inputMultiline,
                    isFocused && styles.inputFocused,
                    Boolean(error) && styles.inputError,
                    !editable && styles.inputDisabled,
                ]}
                placeholder={placeholder}
                placeholderTextColor={colors.textMuted}
                value={value}
                onChangeText={onChangeText}
                secureTextEntry={secureTextEntry}
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                editable={editable}
                multiline={multiline}
                numberOfLines={numberOfLines}
                textAlignVertical={multiline ? 'top' : 'center'}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 20,
        width: '100%',
    },
    labelRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    label: {
        color: colors.atelierBlack,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.8,
        textTransform: 'uppercase',
        fontFamily: typography.sans,
    },
    input: {
        backgroundColor: '#FCFAF7',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 2,
        paddingHorizontal: 16,
        paddingVertical: 13,
        fontSize: 14,
        color: colors.atelierBlack,
        fontFamily: typography.sans,
        ...Platform.select({
            web: {
                outlineStyle: 'none',
            } as any,
        }),
    },
    inputMultiline: {
        minHeight: 80,
        paddingTop: 12,
        paddingBottom: 12,
    },
    inputFocused: {
        borderColor: colors.champagneGold,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
    },
    inputError: {
        borderColor: colors.error,
        backgroundColor: colors.errorBg,
    },
    inputDisabled: {
        backgroundColor: colors.surfaceSubtle,
        color: colors.textMuted,
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
        marginTop: 6,
        fontFamily: typography.sans,
    },
});
