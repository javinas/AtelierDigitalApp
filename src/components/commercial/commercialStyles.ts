// ==============================================================================
// ATELIER DIGITAL — ESTILOS: MÓDULO 03 — CICLO COMERCIAL Y ALTA COSTURA
// Archivo: src/components/commercial/commercialStyles.ts
// ==============================================================================
// Estilos editoriales de Alta Costura para Catálogo de Materiales, Propuestas,
// Cotizaciones A4 formales, Proyectos de Taller y Control Financiero.
// ==============================================================================

import { StyleSheet } from 'react-native';

export const commercialStyles = StyleSheet.create({
    // Contenedores generales
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#EFECE6',
        padding: 20,
        marginBottom: 20,
        shadowColor: '#171411',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F3EF',
    },
    sectionCardTitle: {
        fontFamily: 'serif',
        fontSize: 16,
        fontWeight: '700',
        color: '#171411',
        letterSpacing: 0.5,
    },
    sectionCardTitleGold: {
        fontFamily: 'serif',
        fontSize: 16,
        fontWeight: '700',
        color: '#A78350',
        letterSpacing: 0.5,
    },
    sectionCardSubtitle: {
        fontSize: 12,
        color: '#8A7E72',
        marginTop: 2,
    },

    // Botones de acción principales
    primaryGoldBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#C5A880',
        paddingVertical: 9,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 6,
    },
    primaryGoldBtnText: {
        color: '#171411',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    secondaryOutlineBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: '#E6D9C8',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 8,
        gap: 6,
    },
    secondaryOutlineBtnText: {
        color: '#4A3E31',
        fontSize: 12,
        fontWeight: '600',
    },

    // Tarjetas de Materiales
    materialCard: {
        backgroundColor: '#FAFAF8',
        borderWidth: 1,
        borderColor: '#EFECE6',
        borderRadius: 12,
        padding: 14,
        marginBottom: 12,
    },
    materialCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    materialCategoryBadge: {
        backgroundColor: '#F5EFE6',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E6D9C8',
    },
    materialCategoryBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8A6A4A',
        textTransform: 'uppercase',
    },
    materialPriceText: {
        fontFamily: 'serif',
        fontSize: 14,
        fontWeight: '700',
        color: '#171411',
    },
    materialName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#171411',
        marginBottom: 4,
    },
    materialMetaText: {
        fontSize: 12,
        color: '#766B62',
        marginBottom: 6,
    },
    materialNotesText: {
        fontSize: 11,
        fontStyle: 'italic',
        color: '#9C9084',
        borderTopWidth: 1,
        borderTopColor: '#F0ECE4',
        paddingTop: 6,
        marginTop: 4,
    },

    // Rejilla de Métricas / KPI Comerciales
    kpiRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    kpiCard: {
        flex: 1,
        minWidth: 140,
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: '#EFECE6',
        borderRadius: 12,
        padding: 14,
    },
    kpiLabel: {
        fontSize: 11,
        color: '#8A7E72',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    kpiValue: {
        fontFamily: 'serif',
        fontSize: 18,
        fontWeight: '700',
        color: '#171411',
    },
    kpiValueGold: {
        fontFamily: 'serif',
        fontSize: 18,
        fontWeight: '700',
        color: '#A78350',
    },
    kpiValueGreen: {
        fontFamily: 'serif',
        fontSize: 18,
        fontWeight: '700',
        color: '#3D6346',
    },

    // Tabla de Ítems / Materiales Seleccionados
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#F5F3EF',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        marginBottom: 8,
    },
    tableHeaderText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#766B62',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    tableDataRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F5F3EF',
    },
    tableDataText: {
        fontSize: 13,
        color: '#171411',
    },
    tableDataSubText: {
        fontSize: 11,
        color: '#8A7E72',
    },

    // Estados Vacíos
    emptyStateBox: {
        padding: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FAF8F5',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EFECE6',
        borderStyle: 'dashed',
    },
    emptyStateTitle: {
        fontFamily: 'serif',
        fontSize: 15,
        fontWeight: '600',
        color: '#4A3E31',
        marginBottom: 6,
        textAlign: 'center',
    },
    emptyStateText: {
        fontSize: 12,
        color: '#8A7E72',
        textAlign: 'center',
        lineHeight: 18,
        maxWidth: 420,
        marginBottom: 14,
    },

    // Modales de Atelier
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalContainer: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        width: '100%',
        maxWidth: 680,
        maxHeight: '90%',
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EFECE6',
        marginBottom: 20,
    },
    modalTitle: {
        fontFamily: 'serif',
        fontSize: 18,
        fontWeight: '700',
        color: '#171411',
    },
    modalCloseBtn: {
        padding: 6,
    },
    modalCloseBtnText: {
        fontSize: 18,
        color: '#8A7E72',
        fontWeight: '600',
    },

    // Formularios
    formGroup: {
        marginBottom: 14,
    },
    formLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#4A3E31',
        marginBottom: 6,
    },
    formInput: {
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: '#E6D9C8',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 13,
        color: '#171411',
    },
    formInputDisabled: {
        backgroundColor: '#EFECE6',
        color: '#766B62',
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
    },
    formCol: {
        flex: 1,
    },

    // Chips y Filtros
    chipsScroll: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    chipBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: '#EFECE6',
    },
    chipBtnActive: {
        backgroundColor: '#171411',
        borderColor: '#171411',
    },
    chipBtnText: {
        fontSize: 12,
        color: '#766B62',
        fontWeight: '500',
    },
    chipBtnTextActive: {
        color: '#FAF8F5',
        fontWeight: '700',
    },
    gridOptionCard: {
        backgroundColor: '#FAF8F5',
        borderWidth: 1,
        borderColor: '#EFECE6',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    gridOptionCardActive: {
        backgroundColor: '#171411',
        borderColor: '#C5A880',
    },
    gridOptionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#171411',
    },
    gridOptionTitleActive: {
        color: '#FAF8F5',
    },
    flowPill: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    flowPillText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
});

