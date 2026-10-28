// ==============================================================================
// ATELIER DIGITAL — MODAL COMPARTIDO DE GUÍA VISUAL Y FOTOGRÁFICA DE MEDIDAS
// Archivo: src/components/pattern/AtelierMeasurementGuideModal.tsx
// ==============================================================================
// Modal unificado de inspección anatómica y técnica de alta costura, compartido
// entre el maniquí anatómico y las tarjetas de la tabla de medidas.
// Incorpora fotografía real de atelier, valor actual, definición, instrucciones
// y soporte accesible para navegación por teclado (Escape y foco visible).
// ==============================================================================

import React, { useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Image,
    ScrollView,
    Platform,
} from 'react-native';
import { getMeasurementGuide, MeasurementGuideEntry } from '../../engine/pattern/catalog/measurementGuideCatalog';
import { IconBodyRuler, IconWorkshopParams, IconGarmentDesign, IconInfoGuide } from './AtelierCoutureIcons';

export interface AtelierMeasurementGuideModalProps {
    visible: boolean;
    measureCode: string | null;
    sessionValueMm?: number | null;
    showMmEquivalencies?: boolean;
    onClose: () => void;
    onHighlightInMannequin?: (code: string) => void;
}

export const AtelierMeasurementGuideModal: React.FC<AtelierMeasurementGuideModalProps> = ({
    visible,
    measureCode,
    sessionValueMm,
    showMmEquivalencies = false,
    onClose,
    onHighlightInMannequin,
}) => {
    // Manejo accesible de tecla ESCAPE en Web
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        },
        [onClose]
    );

    useEffect(() => {
        if (!visible) return;
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            window.addEventListener('keydown', handleKeyDown);
            return () => {
                window.removeEventListener('keydown', handleKeyDown);
            };
        }
    }, [visible, handleKeyDown]);

    if (!visible || !measureCode) {
        return null;
    }

    const guide: MeasurementGuideEntry = getMeasurementGuide(measureCode);

    // Formateo del valor de la sesión
    const hasValue = typeof sessionValueMm === 'number' && Number.isFinite(sessionValueMm) && sessionValueMm > 0;
    const isSmallMm = guide.defaultUnit === 'mm' || measureCode.includes('holgura') || measureCode.includes('margen') || measureCode.includes('inclinacion');
    const valueCm = hasValue ? Math.round(sessionValueMm / 10 * 10) / 10 : null;

    const renderCategoryBadge = () => {
        let icon = <IconBodyRuler size={13} color="#D4AF37" />;
        let badgeStyle = styles.categoryBadgeBody;
        let textStyle = styles.categoryBadgeTextBody;

        if (guide.categoryType === 'design') {
            icon = <IconGarmentDesign size={13} color="#C5A059" />;
            badgeStyle = styles.categoryBadgeDesign;
            textStyle = styles.categoryBadgeTextDesign;
        } else if (guide.categoryType === 'workshop') {
            icon = <IconWorkshopParams size={13} color="#A78350" />;
            badgeStyle = styles.categoryBadgeWorkshop;
            textStyle = styles.categoryBadgeTextWorkshop;
        }

        return (
            <View style={[styles.categoryBadge, badgeStyle]}>
                {icon}
                <Text style={[styles.categoryBadgeText, textStyle]}>
                    {guide.categoryLabel.toUpperCase()}
                </Text>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
            accessibilityViewIsModal={true}
            accessibilityRole="alert"
        >
            <View style={styles.modalOverlay}>
                {/* Backdrop táctil para cerrar */}
                <TouchableOpacity
                    style={styles.backdropClickable}
                    activeOpacity={1}
                    onPress={onClose}
                    accessibilityLabel="Cerrar modal de guía"
                />

                <View style={styles.modalCard}>
                    {/* ENCABEZADO */}
                    <View style={styles.modalHeader}>
                        <View style={{ flex: 1, paddingRight: 12 }}>
                            <View style={styles.modalEyebrowRow}>
                                <Text style={styles.modalEyebrow}>GUÍA VISUAL DE ALTA COSTURA</Text>
                                {renderCategoryBadge()}
                            </View>
                            <Text style={styles.modalTitle}>{guide.visibleName}</Text>
                            <Text style={styles.modalCode}>Código canónico: {guide.code}</Text>
                        </View>

                        <TouchableOpacity
                            style={styles.modalCloseBtn}
                            onPress={onClose}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Cerrar guía de medida"
                        >
                            <Text style={styles.modalCloseText}>✕</Text>
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        style={styles.modalScrollArea}
                        contentContainerStyle={styles.modalScrollContent}
                        showsVerticalScrollIndicator={true}
                    >
                        {/* FOTOGRAFÍA REAL DE REFERENCIA */}
                        <View style={styles.photoContainer}>
                            <Image
                                source={guide.photoAsset}
                                style={styles.guidePhoto}
                                resizeMode="cover"
                                accessibilityLabel={guide.altText}
                            />
                            <View style={styles.photoCaptionBar}>
                                <IconInfoGuide size={14} color="#D4AF37" />
                                <Text style={styles.photoCaptionText} numberOfLines={2}>
                                    {guide.altText}
                                </Text>
                            </View>
                        </View>

                        {/* VALOR ACTUAL EN SESIÓN */}
                        <View style={styles.metricBanner}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.metricLabel}>VALOR EN SESIÓN ACTUAL</Text>
                                {hasValue ? (
                                    <View style={styles.metricValueRow}>
                                        <Text style={styles.metricValueLarge}>
                                            {isSmallMm ? `${Math.round(sessionValueMm)} mm` : `${valueCm} cm`}
                                        </Text>
                                        {showMmEquivalencies && (
                                            <Text style={styles.metricValueSub}>
                                                {isSmallMm ? `(${valueCm} cm)` : `(${Math.round(sessionValueMm)} mm)`}
                                            </Text>
                                        )}
                                    </View>
                                ) : (
                                    <Text style={styles.metricValueMissing}>No registrada en esta sesión</Text>
                                )}
                            </View>

                            <View style={styles.unitPill}>
                                <Text style={styles.unitPillText}>
                                    UNIDAD: {guide.defaultUnit.toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        {/* QUÉ REPRESENTA */}
                        <View style={styles.guideSection}>
                            <View style={styles.guideSectionHeader}>
                                <Text style={styles.guideSectionIcon}>✦</Text>
                                <Text style={styles.guideSectionTitle}>QUÉ REPRESENTA EN ALTA COSTURA</Text>
                            </View>
                            <Text style={styles.guideSectionBody}>{guide.definition}</Text>
                        </View>

                        {/* CÓMO Y DÓNDE SE TOMA */}
                        <View style={styles.guideSection}>
                            <View style={styles.guideSectionHeader}>
                                <Text style={styles.guideSectionIcon}>📐</Text>
                                <Text style={styles.guideSectionTitle}>DÓNDE Y CÓMO SE TOMA (PROCEDIMIENTO)</Text>
                            </View>
                            <Text style={styles.guideSectionBody}>{guide.instructions}</Text>
                        </View>

                        {/* PUNTOS ANATÓMICOS DE REFERENCIA */}
                        {guide.anatomicalLandmarks ? (
                            <View style={styles.guideSection}>
                                <View style={styles.guideSectionHeader}>
                                    <Text style={styles.guideSectionIcon}>📍</Text>
                                    <Text style={styles.guideSectionTitle}>PUNTOS Y REFERENCIAS DE CONFECCIÓN</Text>
                                </View>
                                <Text style={styles.guideSectionLandmark}>{guide.anatomicalLandmarks}</Text>
                            </View>
                        ) : null}
                    </ScrollView>

                    {/* PIE DE ACCIONES */}
                    <View style={styles.modalFooter}>
                        {onHighlightInMannequin && (
                            <TouchableOpacity
                                style={styles.btnSecondary}
                                onPress={() => {
                                    onHighlightInMannequin(guide.code);
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.btnSecondaryText}>📍 Destacar cota en maniquí</Text>
                            </TouchableOpacity>
                        )}

                        <TouchableOpacity
                            style={styles.btnPrimary}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.btnPrimaryText}>Entendido · Cerrar Guía</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(7, 9, 13, 0.88)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
        zIndex: 99999,
    },
    backdropClickable: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalCard: {
        width: '100%',
        maxWidth: 640,
        maxHeight: '92%',
        backgroundColor: '#11161F',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#2D3848',
        padding: 22,
        zIndex: 100000,
        ...Platform.select({
            web: {
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(167, 131, 80, 0.25)',
            },
        }),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#1F2836',
        paddingBottom: 14,
        marginBottom: 14,
    },
    modalEyebrowRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexWrap: 'wrap',
        marginBottom: 6,
    },
    modalEyebrow: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: '#A78350',
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        paddingVertical: 2,
        paddingHorizontal: 8,
        borderRadius: 4,
        borderWidth: 1,
    },
    categoryBadgeBody: {
        backgroundColor: 'rgba(212, 175, 55, 0.12)',
        borderColor: 'rgba(212, 175, 55, 0.35)',
    },
    categoryBadgeTextBody: {
        color: '#E5C788',
    },
    categoryBadgeDesign: {
        backgroundColor: 'rgba(167, 131, 80, 0.14)',
        borderColor: 'rgba(197, 160, 89, 0.4)',
    },
    categoryBadgeTextDesign: {
        color: '#F3E5AB',
    },
    categoryBadgeWorkshop: {
        backgroundColor: 'rgba(80, 100, 130, 0.18)',
        borderColor: 'rgba(120, 150, 190, 0.35)',
    },
    categoryBadgeTextWorkshop: {
        color: '#BACCE5',
    },
    categoryBadgeText: {
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.6,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    modalCode: {
        fontSize: 10.5,
        color: '#717D91',
        fontFamily: Platform.select({ ios: 'Menlo', default: 'monospace' }),
        marginTop: 3,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#1A222C',
        borderWidth: 1,
        borderColor: '#2E3A4B',
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    modalCloseText: {
        color: '#A0998E',
        fontSize: 14,
        fontWeight: '700',
    },
    modalScrollArea: {
        flex: 1,
    },
    modalScrollContent: {
        gap: 14,
        paddingBottom: 8,
    },
    photoContainer: {
        position: 'relative',
        width: '100%',
        height: 240,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.3)',
        backgroundColor: '#0A0D12',
    },
    guidePhoto: {
        width: '100%',
        height: '100%',
    },
    photoCaptionBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(10, 14, 20, 0.88)',
        paddingVertical: 7,
        paddingHorizontal: 12,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
    },
    photoCaptionText: {
        flex: 1,
        fontSize: 10,
        color: '#E2DCD2',
        lineHeight: 14,
    },
    metricBanner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#161D27',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#263242',
        padding: 12,
    },
    metricLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#A78350',
        marginBottom: 3,
    },
    metricValueRow: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
    },
    metricValueLarge: {
        fontSize: 22,
        fontWeight: '800',
        color: '#F8F2E9',
    },
    metricValueSub: {
        fontSize: 12,
        color: '#8C9BAE',
        fontWeight: '600',
    },
    metricValueMissing: {
        fontSize: 12,
        fontStyle: 'italic',
        color: '#64748B',
    },
    unitPill: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        backgroundColor: '#1E2734',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#334155',
    },
    unitPillText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#CBD5E1',
        letterSpacing: 0.5,
    },
    guideSection: {
        backgroundColor: '#141A23',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#212A38',
        padding: 12,
    },
    guideSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 6,
    },
    guideSectionIcon: {
        fontSize: 11,
        color: '#D4AF37',
    },
    guideSectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#C5A059',
    },
    guideSectionBody: {
        fontSize: 12,
        color: '#E0DDD7',
        lineHeight: 18,
    },
    guideSectionLandmark: {
        fontSize: 11.5,
        color: '#BAC6D4',
        fontStyle: 'italic',
        lineHeight: 16,
    },
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: '#1F2836',
        paddingTop: 14,
        marginTop: 10,
    },
    btnSecondary: {
        paddingVertical: 9,
        paddingHorizontal: 14,
        borderRadius: 6,
        backgroundColor: '#1A222C',
        borderWidth: 1,
        borderColor: '#2E3A4B',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    btnSecondaryText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#D4AF37',
    },
    btnPrimary: {
        paddingVertical: 9,
        paddingHorizontal: 18,
        borderRadius: 6,
        backgroundColor: '#A78350',
        borderWidth: 1,
        borderColor: '#D4AF37',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    btnPrimaryText: {
        fontSize: 11.5,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.4,
    },
});
