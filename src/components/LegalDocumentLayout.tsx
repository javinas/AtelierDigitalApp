import React from 'react';
import {
    Image,
    ImageSourcePropType,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import PublicHeader from './PublicHeader';
import PublicFooter from './PublicFooter';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';
import {
    LEGAL_DOCUMENTS_NAV,
    LEGAL_EFFECTIVE_DATE,
    LEGAL_LAST_UPDATED,
    LegalRouteKey,
} from '../constants/legalDocuments';

export interface LegalSectionItem {
    id: string;
    number: string;
    title: string;
    paragraphs: string[];
    bullets?: string[];
    highlightNote?: string;
}

interface LegalDocumentLayoutProps {
    activeKey: LegalRouteKey;
    overline: string;
    title: string;
    subtitle: string;
    version: string;
    normativeReference: string;
    heroImage: ImageSourcePropType;
    heroImageCaption: string;
    sections: LegalSectionItem[];
    children?: React.ReactNode;
}

export default function LegalDocumentLayout({
    activeKey,
    overline,
    title,
    subtitle,
    version,
    normativeReference,
    heroImage,
    heroImageCaption,
    sections,
    children,
}: LegalDocumentLayoutProps) {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 940;

    return (
        <ScrollView
            style={styles.root}
            contentContainerStyle={styles.rootContent}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar style="light" />
            <PublicHeader />

            {/* HERO EDITORIAL OSCURO */}
            <View style={styles.heroSection}>
                <View style={styles.heroContainer}>
                    <Text style={styles.overlineText}>{overline}</Text>
                    <Text style={[styles.heroTitle, isDesktop && styles.heroTitleDesktop]}>
                        {title}
                    </Text>
                    <Text style={styles.heroSubtitle}>{subtitle}</Text>

                    <View style={styles.flourishRow}>
                        <View style={styles.flourishLine} />
                        <Image
                            source={require('../../assets/flourish.png')}
                            style={styles.flourishIcon}
                            resizeMode="contain"
                        />
                        <View style={styles.flourishLine} />
                    </View>

                    {/* BARRA DE METADATOS Y VERSIONAMIENTO */}
                    <View style={[styles.metaBar, isDesktop && styles.metaBarDesktop]}>
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>VERSIÓN DEL DOCUMENTO</Text>
                            <Text style={styles.metaValue}>v{version}</Text>
                        </View>
                        <View style={[styles.metaDivider, !isDesktop && styles.hidden]} />
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>FECHA DE ENTRADA EN VIGOR</Text>
                            <Text style={styles.metaValue}>{LEGAL_EFFECTIVE_DATE}</Text>
                        </View>
                        <View style={[styles.metaDivider, !isDesktop && styles.hidden]} />
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>ÚLTIMA ACTUALIZACIÓN</Text>
                            <Text style={styles.metaValue}>{LEGAL_LAST_UPDATED}</Text>
                        </View>
                        <View style={[styles.metaDivider, !isDesktop && styles.hidden]} />
                        <View style={styles.metaItem}>
                            <Text style={styles.metaLabel}>MARCO DE REFERENCIA</Text>
                            <Text style={styles.metaValue}>{normativeReference}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* NAVEGACIÓN TRANSVERSAL ENTRE DOCUMENTOS LEGALES */}
            <View style={styles.docNavStrip}>
                <View style={styles.docNavInner}>
                    {LEGAL_DOCUMENTS_NAV.map((doc) => {
                        const isActive = doc.key === activeKey;
                        return (
                            <TouchableOpacity
                                key={doc.key}
                                style={[styles.docNavPill, isActive && styles.docNavPillActive]}
                                onPress={() => router.push(doc.route as any)}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.docNavPillText,
                                        isActive && styles.docNavPillTextActive,
                                    ]}
                                >
                                    {doc.shortTitle}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* CUERPO EDITORIAL MARFIL CÁLIDO */}
            <View style={styles.bodyWrapper}>
                <View style={[styles.contentGrid, isDesktop && styles.contentGridDesktop]}>
                    {/* COLUMNA LATERAL: IMAGEN EDITORIAL + ÍNDICE + ACCESOS RÁPIDOS */}
                    <View style={[styles.sidebarCol, isDesktop && styles.sidebarColDesktop]}>
                        {/* Imagen Editorial con etiqueta de transparencia IA */}
                        <View style={styles.editorialImageCard}>
                            <Image
                                source={heroImage}
                                style={styles.editorialImage}
                                resizeMode="cover"
                            />
                            <View style={styles.aiTransparencyBadge}>
                                <Text style={styles.aiTransparencyBadgeText}>
                                    ✦ {heroImageCaption}
                                </Text>
                            </View>
                        </View>

                        {/* Índice de Contenido */}
                        <View style={styles.tocCard}>
                            <Text style={styles.tocTitle}>ESTRUCTURA DEL DOCUMENTO</Text>
                            <View style={styles.tocGoldLine} />
                            <View style={styles.tocList}>
                                {sections.map((sec) => (
                                    <View key={sec.id} style={styles.tocItem}>
                                        <Text style={styles.tocNumber}>{sec.number}</Text>
                                        <Text style={styles.tocItemTitle}>{sec.title}</Text>
                                    </View>
                                ))}
                            </View>
                        </View>

                        {/* Aviso de alcance jurídico */}
                        <View style={styles.disclaimerSidebarBox}>
                            <Text style={styles.disclaimerSidebarTitle}>
                                MARCO NORMATIVO Y TRANSPARENCIA
                            </Text>
                            <Text style={styles.disclaimerSidebarText}>
                                Este documento regula el uso informativo y contractual de{' '}
                                <Text style={styles.boldDark}>Atelier Digital · By Katherine Carroll</Text>{' '}
                                bajo la legislación colombiana vigente (Ley 1581 de 2012, Decreto 1074
                                de 2015, Ley 527 de 1999 y Ley 1480 de 2011). Para atención directa al
                                titular escriba a{' '}
                                <Text style={styles.boldDark}>info@bykatherinecarroll.com</Text>.
                            </Text>
                        </View>
                    </View>

                    {/* COLUMNA PRINCIPAL: SECCIONES LEGALES */}
                    <View style={[styles.mainCol, isDesktop && styles.mainColDesktop]}>
                        {children}

                        {sections.map((section) => (
                            <View key={section.id} style={styles.sectionCard}>
                                <View style={styles.sectionHeaderRow}>
                                    <Text style={styles.sectionNumberBadge}>{section.number}</Text>
                                    <Text style={styles.sectionTitle}>{section.title}</Text>
                                </View>
                                <View style={styles.sectionDivider} />

                                {section.paragraphs.map((paragraph, idx) => (
                                    <Text key={idx} style={styles.paragraphText}>
                                        {paragraph}
                                    </Text>
                                ))}

                                {section.bullets && section.bullets.length > 0 && (
                                    <View style={styles.bulletList}>
                                        {section.bullets.map((bullet, bIdx) => (
                                            <View key={bIdx} style={styles.bulletRow}>
                                                <Text style={styles.bulletSymbol}>◆</Text>
                                                <Text style={styles.bulletText}>{bullet}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}

                                {section.highlightNote && (
                                    <View style={styles.highlightBox}>
                                        <Text style={styles.highlightBoxText}>
                                            {section.highlightNote}
                                        </Text>
                                    </View>
                                )}
                            </View>
                        ))}

                        {/* BLOQUE FINAL DE ACCIONES Y RETORNO */}
                        <View style={styles.bottomActionsCard}>
                            <Text style={styles.bottomActionsTitle}>
                                ¿Desea realizar una consulta sobre sus datos o condiciones de servicio?
                            </Text>
                            <Text style={styles.bottomActionsDesc}>
                                Nuestro Atelier atiende de manera personalizada cualquier solicitud de
                                información, ejercicio de derechos de titular (Ley 1581 de 2012) o
                                inquietud sobre nuestro proceso creativo y tecnológico.
                            </Text>

                            <View style={styles.bottomButtonsRow}>
                                <TouchableOpacity
                                    style={styles.primaryActionBtn}
                                    onPress={() => router.push('/contacto' as any)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.primaryActionBtnText}>
                                        CANAL DE CONTACTO Y SOLICITUDES →
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.secondaryActionBtn}
                                    onPress={() => router.push('/(auth)/register' as any)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.secondaryActionBtnText}>
                                        IR A REGISTRO DE CLIENTA
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.tertiaryActionBtn}
                                    onPress={() => router.push('/' as any)}
                                    activeOpacity={0.75}
                                >
                                    <Text style={styles.tertiaryActionBtnText}>
                                        ← Volver a la Portada
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            <PublicFooter />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: colors.atelierBlack,
    },
    rootContent: {
        flexGrow: 1,
    },
    hidden: {
        display: 'none',
    },

    /* HERO */
    heroSection: {
        backgroundColor: colors.atelierBlack,
        paddingTop: 52,
        paddingBottom: 44,
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(167, 131, 80, 0.25)',
    },
    heroContainer: {
        maxWidth: 1180,
        marginHorizontal: 'auto',
        width: '100%',
        alignItems: 'center',
    },
    overlineText: {
        color: colors.champagneGold,
        fontSize: 10.5,
        letterSpacing: 3,
        fontWeight: '700',
        fontFamily: typography.sans,
        textAlign: 'center',
        marginBottom: 14,
    },
    heroTitle: {
        color: colors.ivoryWarm,
        fontSize: 30,
        lineHeight: 38,
        fontFamily: typography.serif,
        fontWeight: '400',
        textAlign: 'center',
        marginBottom: 14,
        maxWidth: 840,
    },
    heroTitleDesktop: {
        fontSize: 38,
        lineHeight: 46,
    },
    heroSubtitle: {
        color: '#D4C8B8',
        fontSize: 14,
        lineHeight: 22,
        fontFamily: typography.sans,
        textAlign: 'center',
        maxWidth: 760,
        marginBottom: 22,
    },
    flourishRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 240,
        marginBottom: 28,
    },
    flourishLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(167, 131, 80, 0.45)',
    },
    flourishIcon: {
        width: 40,
        height: 18,
        marginHorizontal: 10,
        opacity: 0.9,
    },
    metaBar: {
        width: '100%',
        backgroundColor: '#1E1A16',
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.3)',
        borderRadius: 4,
        paddingVertical: 14,
        paddingHorizontal: 20,
        gap: 12,
    },
    metaBarDesktop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
    },
    metaItem: {
        alignItems: 'center',
    },
    metaLabel: {
        color: colors.champagneGold,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.8,
        fontFamily: typography.sans,
        marginBottom: 3,
    },
    metaValue: {
        color: colors.ivoryWarm,
        fontSize: 12,
        fontWeight: '500',
        fontFamily: typography.sans,
    },
    metaDivider: {
        width: 1,
        height: 28,
        backgroundColor: 'rgba(167, 131, 80, 0.25)',
    },

    /* STRIP DE NAVEGACIÓN ENTRE DOCUMENTOS */
    docNavStrip: {
        backgroundColor: '#13100E',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(167, 131, 80, 0.25)',
        paddingVertical: 12,
        paddingHorizontal: 20,
    },
    docNavInner: {
        maxWidth: 1180,
        marginHorizontal: 'auto',
        width: '100%',
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 10,
    },
    docNavPill: {
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.3)',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
    },
    docNavPillActive: {
        backgroundColor: colors.champagneGold,
        borderColor: colors.champagneGold,
    },
    docNavPillText: {
        color: '#D4C8B8',
        fontSize: 11.5,
        fontWeight: '600',
        letterSpacing: 0.6,
        fontFamily: typography.sans,
    },
    docNavPillTextActive: {
        color: colors.atelierBlack,
        fontWeight: '700',
    },

    /* CUERPO MARFIL */
    bodyWrapper: {
        backgroundColor: colors.ivoryWarm,
        paddingVertical: 48,
        paddingHorizontal: 20,
    },
    contentGrid: {
        maxWidth: 1220,
        marginHorizontal: 'auto',
        width: '100%',
        flexDirection: 'column',
        gap: 28,
    },
    contentGridDesktop: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 36,
    },

    /* SIDEBAR */
    sidebarCol: {
        width: '100%',
        gap: 20,
    },
    sidebarColDesktop: {
        width: 350,
    },
    editorialImageCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 3,
        overflow: 'hidden',
    },
    editorialImage: {
        width: '100%',
        height: 220,
        backgroundColor: colors.atelierBlack,
    },
    aiTransparencyBadge: {
        backgroundColor: colors.atelierBlack,
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: colors.champagneGold,
    },
    aiTransparencyBadgeText: {
        color: '#D4C8B8',
        fontSize: 10,
        lineHeight: 14,
        fontFamily: typography.sans,
        fontStyle: 'italic',
    },
    tocCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 3,
        padding: 20,
    },
    tocTitle: {
        color: colors.atelierBlack,
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 2,
        fontFamily: typography.sans,
        marginBottom: 8,
    },
    tocGoldLine: {
        width: 32,
        height: 1.5,
        backgroundColor: colors.champagneGold,
        marginBottom: 14,
    },
    tocList: {
        gap: 10,
    },
    tocItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 8,
    },
    tocNumber: {
        color: colors.champagneGold,
        fontSize: 11,
        fontWeight: '700',
        fontFamily: typography.serif,
        minWidth: 22,
    },
    tocItemTitle: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
        fontFamily: typography.sans,
        flex: 1,
    },
    disclaimerSidebarBox: {
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.sand,
        borderLeftWidth: 3,
        borderLeftColor: colors.bronze,
        borderRadius: 3,
        padding: 16,
    },
    disclaimerSidebarTitle: {
        color: colors.bronze,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.5,
        fontFamily: typography.sans,
        marginBottom: 6,
    },
    disclaimerSidebarText: {
        color: colors.textSecondary,
        fontSize: 11.5,
        lineHeight: 17,
        fontFamily: typography.sans,
    },
    boldDark: {
        color: colors.atelierBlack,
        fontWeight: '600',
    },

    /* MAIN CONTENT */
    mainCol: {
        flex: 1,
        gap: 22,
    },
    mainColDesktop: {
        flex: 1,
    },
    sectionCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 3,
        padding: 26,
        shadowColor: colors.atelierBlack,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.03,
        shadowRadius: 8,
        elevation: 1,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    sectionNumberBadge: {
        color: colors.champagneGold,
        fontSize: 16,
        fontWeight: '700',
        fontFamily: typography.serif,
    },
    sectionTitle: {
        color: colors.atelierBlack,
        fontSize: 20,
        lineHeight: 26,
        fontFamily: typography.serif,
        fontWeight: '400',
        flex: 1,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: colors.sand,
        marginBottom: 16,
    },
    paragraphText: {
        color: colors.textPrimary,
        fontSize: 13.5,
        lineHeight: 22,
        fontFamily: typography.sans,
        marginBottom: 12,
    },
    bulletList: {
        marginTop: 4,
        marginBottom: 12,
        paddingLeft: 6,
        gap: 8,
    },
    bulletRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    bulletSymbol: {
        color: colors.champagneGold,
        fontSize: 9,
        marginTop: 5,
    },
    bulletText: {
        color: colors.textSecondary,
        fontSize: 13,
        lineHeight: 20,
        fontFamily: typography.sans,
        flex: 1,
    },
    highlightBox: {
        backgroundColor: colors.surfaceSubtle,
        borderLeftWidth: 3,
        borderLeftColor: colors.champagneGold,
        padding: 14,
        borderRadius: 2,
        marginTop: 6,
    },
    highlightBoxText: {
        color: colors.atelierBlack,
        fontSize: 12.5,
        lineHeight: 19,
        fontFamily: typography.sans,
    },

    /* BOTTOM ACTIONS */
    bottomActionsCard: {
        backgroundColor: colors.atelierBlack,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        borderRadius: 4,
        padding: 28,
        alignItems: 'center',
        marginTop: 8,
    },
    bottomActionsTitle: {
        color: colors.ivoryWarm,
        fontSize: 20,
        fontFamily: typography.serif,
        textAlign: 'center',
        marginBottom: 8,
    },
    bottomActionsDesc: {
        color: '#D4C8B8',
        fontSize: 13,
        lineHeight: 20,
        fontFamily: typography.sans,
        textAlign: 'center',
        maxWidth: 640,
        marginBottom: 20,
    },
    bottomButtonsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    primaryActionBtn: {
        backgroundColor: colors.champagneGold,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 3,
    },
    primaryActionBtnText: {
        color: colors.atelierBlack,
        fontSize: 11.5,
        fontWeight: '700',
        letterSpacing: 1.3,
        fontFamily: typography.sans,
    },
    secondaryActionBtn: {
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingVertical: 12,
        paddingHorizontal: 18,
        borderRadius: 3,
    },
    secondaryActionBtnText: {
        color: colors.ivoryWarm,
        fontSize: 11.5,
        fontWeight: '600',
        letterSpacing: 1.2,
        fontFamily: typography.sans,
    },
    tertiaryActionBtn: {
        paddingVertical: 10,
        paddingHorizontal: 14,
    },
    tertiaryActionBtnText: {
        color: '#D4C8B8',
        fontSize: 12,
        fontFamily: typography.sans,
        textDecorationLine: 'underline',
    },
});

