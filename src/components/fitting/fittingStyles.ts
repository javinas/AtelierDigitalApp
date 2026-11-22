// ==============================================================================
// ATELIER DIGITAL — MÓDULO 06: ESTILOS CONSOLIDADOS DE FITTING
// Archivo: src/components/fitting/fittingStyles.ts
// ==============================================================================
// Estilos con diseño responsivo, estética de Alta Costura By Katherine Carroll,
// tarjetas de prueba, banners inline de conflicto optimista y modales editoriales.
// ==============================================================================

import { StyleSheet } from 'react-native';
import { colors } from '../../theme/colors';

export const fittingStyles = StyleSheet.create({
    // Contenedores principales
    container: {
        flex: 1,
        backgroundColor: colors.ivoryWarm,
    },
    sectionCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 16,
        marginBottom: 16,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 12,
    },
    titleEditorial: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.3,
    },
    subtitleEditorial: {
        fontSize: 13,
        color: colors.textSecondary,
        lineHeight: 18,
    },

    // Insignias y pastillas
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        alignSelf: 'flex-start',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    roundBadge: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: colors.champagneGold,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 3,
        borderWidth: 1,
    },
    roundBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.bronze,
        textTransform: 'uppercase',
    },
    versionBadge: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: colors.sand,
        borderWidth: 1,
        borderRadius: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    versionBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.textMuted,
    },

    // Tarjeta de sesión
    sessionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        flexWrap: 'wrap',
        gap: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        paddingBottom: 12,
        marginBottom: 12,
    },
    metaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginVertical: 8,
    },
    metaItem: {
        minWidth: 120,
        flex: 1,
    },
    metaLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 2,
    },
    metaValue: {
        fontSize: 13,
        color: colors.atelierBlack,
        fontWeight: '500',
    },
    notesBlock: {
        backgroundColor: colors.surfaceSubtle,
        borderRadius: 6,
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
        padding: 10,
        marginVertical: 8,
    },
    notesText: {
        fontSize: 12,
        color: colors.atelierBlack,
        lineHeight: 17,
        fontStyle: 'italic',
    },

    // Ajuste en lista / checklist
    adjustmentCard: {
        backgroundColor: colors.surface,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 12,
        marginBottom: 8,
    },
    adjustmentHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 6,
    },
    adjustmentTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    adjustmentDescription: {
        fontSize: 13,
        color: colors.atelierBlack,
        lineHeight: 18,
        marginBottom: 6,
    },
    deltaBadge: {
        backgroundColor: colors.surfaceSubtle,
        borderColor: colors.champagneGold,
        borderWidth: 1,
        borderRadius: 3,
        paddingHorizontal: 6,
        paddingVertical: 1,
    },
    deltaBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.bronze,
    },
    traceabilityText: {
        fontSize: 11,
        color: colors.textMuted,
        marginTop: 4,
    },

    // Botones de acción
    actionBtnRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 10,
    },
    primaryBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 6,
        minHeight: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    primaryBtnText: {
        color: colors.ivoryWarm,
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    secondaryBtn: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 14,
        paddingVertical: 9,
        borderRadius: 6,
        minHeight: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryBtnText: {
        color: colors.bronze,
        fontSize: 12,
        fontWeight: '700',
    },
    dangerBtn: {
        backgroundColor: colors.errorBg,
        borderWidth: 1,
        borderColor: colors.errorBorder,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        minHeight: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dangerBtnText: {
        color: colors.error,
        fontSize: 12,
        fontWeight: '700',
    },
    disabledBtn: {
        opacity: 0.45,
    },

    // Banners inline y avisos de error/concurrencia
    feedbackBanner: {
        borderRadius: 6,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        gap: 8,
    },
    errorBanner: {
        backgroundColor: colors.errorBg,
        borderColor: colors.errorBorder,
    },
    errorText: {
        color: colors.error,
        fontSize: 13,
        lineHeight: 18,
        flex: 1,
    },
    concurrencyBanner: {
        backgroundColor: '#FFF9ED',
        borderColor: '#E8D5B5',
        borderLeftWidth: 4,
        borderLeftColor: colors.champagneGold,
    },
    concurrencyText: {
        color: '#6E4D1A',
        fontSize: 13,
        lineHeight: 18,
        flex: 1,
    },
    bannerDismissBtn: {
        paddingHorizontal: 8,
        paddingVertical: 2,
    },
    bannerDismissText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.textSecondary,
    },

    // Galería multimedia
    mediaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginVertical: 10,
    },
    mediaThumbnail: {
        width: 100,
        height: 100,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.surfaceSubtle,
        overflow: 'hidden',
        position: 'relative',
    },
    mediaImage: {
        width: '100%',
        height: '100%',
    },
    mediaDocPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 6,
    },
    mediaDocIcon: {
        fontSize: 24,
        marginBottom: 2,
    },
    mediaDocLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: colors.atelierBlack,
        textAlign: 'center',
    },
    mediaDeleteButton: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: 'rgba(23,20,17,0.75)',
        width: 22,
        height: 22,
        borderRadius: 11,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mediaDeleteButtonText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
        lineHeight: 14,
    },

    // Modales y formularios
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContainer: {
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.sand,
        width: '100%',
        maxWidth: 620,
        maxHeight: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 6,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    modalCloseBtn: {
        padding: 4,
    },
    modalCloseText: {
        fontSize: 18,
        color: colors.textSecondary,
        fontWeight: '700',
    },
    modalBody: {
        padding: 20,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        backgroundColor: colors.surfaceSubtle,
        borderBottomLeftRadius: 10,
        borderBottomRightRadius: 10,
    },

    // Campos de formulario
    formGroup: {
        marginBottom: 14,
    },
    formLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
        textTransform: 'uppercase',
        letterSpacing: 0.4,
        marginBottom: 6,
    },
    formHelpText: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 4,
        lineHeight: 15,
    },
    textInput: {
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 6,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
        color: colors.atelierBlack,
    },
    textArea: {
        minHeight: 70,
        textAlignVertical: 'top',
    },
    chipGroup: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },
    chipItem: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.surface,
    },
    chipItemActive: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    chipText: {
        fontSize: 12,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    chipTextActive: {
        color: colors.ivoryWarm,
        fontWeight: '700',
    },

    // Checklist ceremonial
    checklistRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
        gap: 10,
    },
    checkbox: {
        width: 22,
        height: 22,
        borderRadius: 4,
        borderWidth: 1.5,
        borderColor: colors.champagneGold,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    checkboxChecked: {
        backgroundColor: colors.atelierBlack,
        borderColor: colors.atelierBlack,
    },
    checkboxCheckText: {
        color: '#FFFFFF',
        fontSize: 13,
        fontWeight: '700',
    },
    checklistLabel: {
        fontSize: 13,
        color: colors.atelierBlack,
        flex: 1,
    },
});

