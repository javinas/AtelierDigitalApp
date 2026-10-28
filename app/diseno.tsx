import React from 'react';
import {
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import PublicHeader from '../src/components/PublicHeader';
import PublicFooter from '../src/components/PublicFooter';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import { SERVICES } from '../src/data/servicesData';

export default function DisenoScreen() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 940;

    // Filter the 5 specific lines requested for "Diseño"
    const disenoLines = [
        SERVICES.find((s) => s.id === 'alta-costura')!,
        SERVICES.find((s) => s.id === 'primera-comunion')!,
        SERVICES.find((s) => s.id === 'disfraces')!,
        SERVICES.find((s) => s.id === 'carnaval')!,
        SERVICES.find((s) => s.id === 'accesorios')!,
    ];

    return (
        <ScrollView
            style={styles.root}
            contentContainerStyle={styles.rootContent}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar style="light" />
            <PublicHeader currentRoute="diseno" />

            {/* Hero Section Editorial */}
            <View style={styles.heroSection}>
                <View style={styles.heroContent}>
                    <Text style={styles.badgeLabel}>ATELIER DE AUTOR · PROPUESTAS A MEDIDA</Text>
                    <Text style={styles.mainTitle}>
                        Diseños que expresan tu esencia.
                    </Text>

                    <Text style={styles.introText}>
                        «Cada ocasión, cada idea y cada persona tienen una historia. En By Katherine
                        Carroll, el diseño es el punto de partida para explorar posibilidades,
                        seleccionar materiales y desarrollar propuestas que respondan a cada
                        necesidad».
                    </Text>

                    <View style={styles.flourishRow}>
                        <View style={styles.flourishLine} />
                        <Image
                            source={require('../assets/flourish.png')}
                            style={styles.flourishIcon}
                            resizeMode="contain"
                        />
                        <View style={styles.flourishLine} />
                    </View>
                </View>
            </View>

            {/* Design Lines List / Grid */}
            <View style={styles.linesContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTag}>LÍNEAS DE DISEÑO</Text>
                    <Text style={styles.sectionHeading}>
                        Creatividad y asesoría para cada momento especial
                    </Text>
                </View>

                <View style={styles.linesList}>
                    {disenoLines.map((line, index) => {
                        const isEven = index % 2 === 0;
                        return (
                            <View
                                key={line.id}
                                style={[
                                    styles.lineCard,
                                    isDesktop && (isEven ? styles.lineCardRow : styles.lineCardRowReverse),
                                ]}
                            >
                                {/* Line Image */}
                                <View style={[styles.imageWrapper, isDesktop && styles.imageWrapperDesktop]}>
                                    <Image
                                        source={line.image}
                                        style={styles.cardImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.imageOverlay} />
                                </View>

                                {/* Line Editorial Content */}
                                <View style={[styles.cardContent, isDesktop && styles.cardContentDesktop]}>
                                    <Text style={styles.lineIndex}>0{index + 1} / LÍNEA DE DISEÑO</Text>
                                    <Text style={styles.lineTitle}>{line.title}</Text>
                                    {line.subtitle && (
                                        <Text style={styles.lineSubtitle}>{line.subtitle}</Text>
                                    )}

                                    <View style={styles.smallGoldLine} />

                                    <Text style={styles.lineDescription}>
                                        {line.designDescription}
                                    </Text>

                                    <Text style={styles.lineDetailSecondary}>
                                        {line.shortDescription}
                                    </Text>

                                    <View style={styles.actionRow}>
                                        <TouchableOpacity
                                            style={styles.ctaButton}
                                            onPress={() =>
                                                router.push({
                                                    pathname: '/contacto',
                                                    params: { servicio: line.id },
                                                })
                                            }
                                            activeOpacity={0.88}
                                        >
                                            <Text style={styles.ctaButtonText}>
                                                CONSULTAR ESTE DISEÑO
                                            </Text>
                                            <Text style={styles.ctaArrow}>→</Text>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.detailLink}
                                            onPress={() => router.push('/servicios')}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={styles.detailLinkText}>
                                                Ver en catálogo completo
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Bottom Invitation Banner */}
            <View style={styles.bottomBanner}>
                <View style={styles.bottomBannerContent}>
                    <Text style={styles.bottomBannerTitle}>
                        ¿Tienes una idea en mente para tu próximo evento?
                    </Text>
                    <Text style={styles.bottomBannerText}>
                        Permítenos acompañarte desde los primeros bocetos y la selección de telas
                        hasta la confección final con el sello de By Katherine Carroll.
                    </Text>
                    <TouchableOpacity
                        style={styles.primaryGoldBtn}
                        onPress={() => router.push('/contacto')}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.primaryGoldBtnText}>HABLEMOS DE TU PROYECTO</Text>
                        <Text style={styles.primaryGoldBtnArrow}>→</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <PublicFooter />
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: '#171411',
    },
    rootContent: {
        flexGrow: 1,
    },
    heroSection: {
        backgroundColor: '#171411',
        paddingVertical: 64,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(167, 131, 80, 0.2)',
    },
    heroContent: {
        maxWidth: 820,
        alignItems: 'center',
        textAlign: 'center',
    },
    badgeLabel: {
        color: colors.champagneGold,
        fontSize: 11,
        letterSpacing: 3,
        fontWeight: '700',
        marginBottom: 16,
        fontFamily: typography.sans,
        textAlign: 'center',
    },
    mainTitle: {
        color: '#FFFFFF',
        fontSize: 34,
        lineHeight: 42,
        fontFamily: typography.serif,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 20,
    },
    introText: {
        color: '#D4C8B8',
        fontSize: 16,
        lineHeight: 26,
        fontFamily: typography.serif,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 28,
        paddingHorizontal: 12,
    },
    flourishRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        width: '60%',
        maxWidth: 320,
    },
    flourishLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(167, 131, 80, 0.35)',
    },
    flourishIcon: {
        width: 32,
        height: 16,
        opacity: 0.9,
    },
    linesContainer: {
        backgroundColor: '#1C1814',
        paddingVertical: 64,
        paddingHorizontal: 24,
    },
    sectionHeader: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        width: '100%',
        marginBottom: 44,
        alignItems: 'center',
    },
    sectionTag: {
        color: colors.champagneGold,
        fontSize: 10.5,
        letterSpacing: 2.5,
        fontWeight: '700',
        marginBottom: 8,
        fontFamily: typography.sans,
    },
    sectionHeading: {
        color: '#F8F2E9',
        fontSize: 24,
        fontFamily: typography.serif,
        textAlign: 'center',
    },
    linesList: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        width: '100%',
        gap: 40,
    },
    lineCard: {
        backgroundColor: '#171411',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.22)',
        overflow: 'hidden',
    },
    lineCardRow: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    lineCardRowReverse: {
        flexDirection: 'row-reverse',
        alignItems: 'stretch',
    },
    imageWrapper: {
        height: 280,
        position: 'relative',
        backgroundColor: '#0F0D0B',
    },
    imageWrapperDesktop: {
        flex: 1.1,
        height: 380,
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    imageOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(23, 20, 17, 0.15)',
    },
    cardContent: {
        padding: 28,
        justifyContent: 'center',
    },
    cardContentDesktop: {
        flex: 1.2,
        padding: 44,
    },
    lineIndex: {
        color: colors.champagneGold,
        fontSize: 10,
        letterSpacing: 2,
        fontWeight: '700',
        marginBottom: 8,
        fontFamily: typography.sans,
    },
    lineTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontFamily: typography.serif,
        fontWeight: '600',
        lineHeight: 28,
        marginBottom: 4,
    },
    lineSubtitle: {
        color: '#A78350',
        fontSize: 13,
        letterSpacing: 0.5,
        marginBottom: 16,
        fontFamily: typography.sans,
    },
    smallGoldLine: {
        width: 44,
        height: 1.5,
        backgroundColor: colors.champagneGold,
        marginBottom: 16,
    },
    lineDescription: {
        color: '#E8DED1',
        fontSize: 14.5,
        lineHeight: 23,
        marginBottom: 12,
        fontFamily: typography.sans,
    },
    lineDetailSecondary: {
        color: '#9C9185',
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 24,
        fontFamily: typography.sans,
    },
    actionRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: 16,
    },
    ctaButton: {
        backgroundColor: colors.champagneGold,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 4,
    },
    ctaButtonText: {
        color: '#171411',
        fontSize: 11.5,
        fontWeight: '700',
        letterSpacing: 1.2,
        fontFamily: typography.sans,
    },
    ctaArrow: {
        color: '#171411',
        fontSize: 13,
        fontWeight: '700',
    },
    detailLink: {
        paddingVertical: 8,
    },
    detailLinkText: {
        color: '#D4C8B8',
        fontSize: 12.5,
        textDecorationLine: 'underline',
        fontFamily: typography.sans,
    },
    bottomBanner: {
        backgroundColor: '#13100E',
        paddingVertical: 56,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.2)',
        alignItems: 'center',
    },
    bottomBannerContent: {
        maxWidth: 720,
        alignItems: 'center',
        textAlign: 'center',
    },
    bottomBannerTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontFamily: typography.serif,
        marginBottom: 12,
        textAlign: 'center',
    },
    bottomBannerText: {
        color: '#B5A99B',
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: typography.sans,
    },
    primaryGoldBtn: {
        backgroundColor: colors.champagneGold,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 4,
    },
    primaryGoldBtnText: {
        color: '#171411',
        fontSize: 12,
        letterSpacing: 1.8,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    primaryGoldBtnArrow: {
        color: '#171411',
        fontSize: 14,
        fontWeight: '700',
    },
});
