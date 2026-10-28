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

export default function ServiciosScreen() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 900;

    return (
        <ScrollView
            style={styles.root}
            contentContainerStyle={styles.rootContent}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar style="light" />
            <PublicHeader currentRoute="servicios" />

            {/* Hero Header */}
            <View style={styles.heroSection}>
                <View style={styles.heroContent}>
                    <Text style={styles.badgeLabel}>CATÁLOGO DE SERVICIOS · BY KATHERINE CARROLL</Text>
                    <Text style={styles.mainTitle}>
                        Nuestra oferta de diseño y confección.
                    </Text>

                    <Text style={styles.introText}>
                        Explora las ocho líneas de trabajo de nuestro taller en Barranquilla,
                        concebidas para responder con elegancia, técnica y distinción a tus proyectos
                        personales, festivos e institucionales.
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

            {/* 8 Services Grid */}
            <View style={styles.servicesContainer}>
                <View style={styles.sectionInfo}>
                    <Text style={styles.sectionTag}>8 CATEGORÍAS ESPECIALIZADAS</Text>
                    <Text style={styles.sectionHeading}>
                        Atención personalizada para cada línea de servicio
                    </Text>
                </View>

                <View style={[styles.servicesGrid, isDesktop && styles.servicesGridDesktop]}>
                    {SERVICES.map((item, index) => (
                        <View
                            key={item.id}
                            style={[styles.serviceCard, isDesktop && styles.serviceCardDesktop]}
                        >
                            <View style={styles.imageContainer}>
                                <Image
                                    source={item.image}
                                    style={styles.cardImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.cardBadge}>
                                    <Text style={styles.cardBadgeText}>0{index + 1}</Text>
                                </View>
                            </View>

                            <View style={styles.cardBody}>
                                <Text style={styles.cardTitle}>{item.title}</Text>
                                {item.subtitle && (
                                    <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
                                )}

                                <View style={styles.cardLine} />

                                <Text style={styles.cardDescription}>
                                    {item.shortDescription}
                                </Text>

                                <TouchableOpacity
                                    style={styles.consultButton}
                                    onPress={() =>
                                        router.push({
                                            pathname: '/contacto',
                                            params: { servicio: item.id },
                                        })
                                    }
                                    activeOpacity={0.88}
                                >
                                    <Text style={styles.consultButtonText}>
                                        CONSULTAR ESTE SERVICIO
                                    </Text>
                                    <Text style={styles.consultButtonArrow}>→</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            </View>

            {/* Contact Callout Banner */}
            <View style={styles.calloutBanner}>
                <View style={styles.calloutContent}>
                    <Text style={styles.calloutTitle}>
                        ¿Tienes un proyecto especial o una necesidad combinada?
                    </Text>
                    <Text style={styles.calloutText}>
                        Podemos asesorarte de manera integral en el diseño de vestuario,
                        accesorios coordinados o soluciones corporativas a gran escala.
                    </Text>
                    <TouchableOpacity
                        style={styles.goldActionBtn}
                        onPress={() => router.push('/contacto')}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.goldActionBtnText}>INICIAR UNA CONSULTA GENERAL</Text>
                        <Text style={styles.goldActionBtnArrow}>→</Text>
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
    servicesContainer: {
        backgroundColor: '#1C1814',
        paddingVertical: 64,
        paddingHorizontal: 24,
    },
    sectionInfo: {
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
    servicesGrid: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        width: '100%',
        gap: 32,
    },
    servicesGridDesktop: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    serviceCard: {
        backgroundColor: '#171411',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.22)',
        overflow: 'hidden',
    },
    serviceCardDesktop: {
        width: '48.5%',
    },
    imageContainer: {
        height: 240,
        position: 'relative',
        backgroundColor: '#0F0D0B',
    },
    cardImage: {
        width: '100%',
        height: '100%',
    },
    cardBadge: {
        position: 'absolute',
        top: 14,
        right: 14,
        backgroundColor: '#171411',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    cardBadgeText: {
        color: colors.champagneGold,
        fontSize: 11,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    cardBody: {
        padding: 24,
        flex: 1,
        justifyContent: 'space-between',
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontFamily: typography.serif,
        fontWeight: '600',
        lineHeight: 26,
        marginBottom: 4,
    },
    cardSubtitle: {
        color: colors.champagneGold,
        fontSize: 12,
        letterSpacing: 0.5,
        marginBottom: 14,
        fontFamily: typography.sans,
    },
    cardLine: {
        width: 36,
        height: 1.5,
        backgroundColor: colors.champagneGold,
        marginBottom: 14,
    },
    cardDescription: {
        color: '#D4C8B8',
        fontSize: 13.5,
        lineHeight: 21,
        marginBottom: 20,
        fontFamily: typography.sans,
    },
    consultButton: {
        backgroundColor: colors.champagneGold,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 4,
    },
    consultButtonText: {
        color: '#171411',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1.2,
        fontFamily: typography.sans,
    },
    consultButtonArrow: {
        color: '#171411',
        fontSize: 12,
        fontWeight: '700',
    },
    calloutBanner: {
        backgroundColor: '#13100E',
        paddingVertical: 56,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.2)',
        alignItems: 'center',
    },
    calloutContent: {
        maxWidth: 720,
        alignItems: 'center',
        textAlign: 'center',
    },
    calloutTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontFamily: typography.serif,
        marginBottom: 10,
        textAlign: 'center',
    },
    calloutText: {
        color: '#B5A99B',
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: typography.sans,
    },
    goldActionBtn: {
        backgroundColor: colors.champagneGold,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 4,
    },
    goldActionBtnText: {
        color: '#171411',
        fontSize: 12,
        letterSpacing: 1.8,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    goldActionBtnArrow: {
        color: '#171411',
        fontSize: 14,
        fontWeight: '700',
    },
});
