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

interface ExclusivityPillar {
    number: string;
    title: string;
    description: string;
}

interface ProcessStep {
    step: string;
    title: string;
    description: string;
}

export default function ExclusividadScreen() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 940;

    const pillars: ExclusivityPillar[] = [
        {
            number: '01',
            title: 'Diseño y confección adaptados a cada necesidad',
            description:
                'Cada silueta, contexto y persona requiere un enfoque particular. No trabajamos con moldes masivos: adaptamos cada propuesta para reflejar autenticidad, comodidad y distinción.',
        },
        {
            number: '02',
            title: 'Selección de telas y materiales',
            description:
                'Exploramos texturas nobles, sedas, linos, encajes finos, tejidos estructurados y telas de alta resistencia seleccionadas específicamente para el propósito de cada creación.',
        },
        {
            number: '03',
            title: 'Detalles, tocados y apliques',
            description:
                'El sello distintivo de By Katherine Carroll reside en los acabados minuciosos: pedrería cocida con precisión, apliques bordados y tocados artesanales llenos de carácter.',
        },
        {
            number: '04',
            title: 'Vestuario para celebraciones y eventos',
            description:
                'Acompañamos momentos irrepetibles como bodas, aniversarios, Primeras Comuniones y eventos de gala con propuestas que perduran en la memoria y en las fotografías familiares.',
        },
        {
            number: '05',
            title: 'Soluciones textiles para empresas y hogar',
            description:
                'Llevamos la rigurosidad del atelier a la confección institucional y a la lencería de hogar, garantizando sobriedad, consistencia corporativa y acabados de primera categoría.',
        },
        {
            number: '06',
            title: 'Accesorios y complementos',
            description:
                'Completamos cada propuesta estética con carteras de fiesta, clutches ornamentados y complementos concebidos para dialogar en perfecta armonía con el atuendo.',
        },
    ];

    const processSteps: ProcessStep[] = [
        {
            step: 'PASO 1',
            title: 'Conversar sobre la idea o necesidad',
            description:
                'El primer encuentro nos permite conocer tu expectativa, el tipo de ocasión o el requerimiento técnico que deseas desarrollar.',
        },
        {
            step: 'PASO 2',
            title: 'Explorar referencias, estilos y materiales',
            description:
                'Revisamos muestras de telas, paletas de colores, cortes y detalles ornamentales que mejor se alineen con tu proyecto.',
        },
        {
            step: 'PASO 3',
            title: 'Definir una propuesta',
            description:
                'Consolidamos la propuesta de diseño y confección, definiendo la estructura visual y los materiales seleccionados.',
        },
        {
            step: 'PASO 4',
            title: 'Acordar los detalles de confección',
            description:
                'Precisamos medidas, cronograma de pruebas y especificaciones de acabados para asegurar un resultado a tu entera satisfacción.',
        },
        {
            step: 'PASO 5',
            title: 'Dar seguimiento al trabajo y a su entrega',
            description:
                'Acompañamos el avance en el atelier y coordinamos la entrega final cuidando la presentación y cada detalle de la prenda.',
        },
    ];

    return (
        <ScrollView
            style={styles.root}
            contentContainerStyle={styles.rootContent}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar style="light" />
            <PublicHeader currentRoute="exclusividad" />

            {/* Hero Section */}
            <View style={styles.heroSection}>
                <View style={styles.heroContent}>
                    <Text style={styles.badgeLabel}>FILOSOFÍA DE ATELIER · ALTA COSTURA DE AUTOR</Text>
                    <Text style={styles.mainTitle}>
                        Los detalles hacen la diferencia.
                    </Text>

                    <Text style={styles.introText}>
                        En By Katherine Carroll entendemos que la verdadera exclusividad no radica
                        únicamente en lo visual, sino en la dedicación de cada corte, la pureza de los
                        materiales seleccionados y el diálogo cercano con cada persona.
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

            {/* 6 Value Pillars Grid */}
            <View style={styles.pillarsSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTag}>NUESTROS PILARES DE EXCLUSIVIDAD</Text>
                    <Text style={styles.sectionHeading}>
                        Atención al detalle en cada dimensión de nuestro trabajo
                    </Text>
                </View>

                <View style={[styles.pillarsGrid, isDesktop && styles.pillarsGridDesktop]}>
                    {pillars.map((pillar) => (
                        <View
                            key={pillar.number}
                            style={[styles.pillarCard, isDesktop && styles.pillarCardDesktop]}
                        >
                            <Text style={styles.pillarNumber}>{pillar.number}</Text>
                            <Text style={styles.pillarTitle}>{pillar.title}</Text>
                            <View style={styles.pillarLine} />
                            <Text style={styles.pillarDescription}>{pillar.description}</Text>
                        </View>
                    ))}
                </View>
            </View>

            {/* Creative Process Section (The 5 Steps) */}
            <View style={styles.processSection}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTag}>FLUJO DE ATENCIÓN</Text>
                    <Text style={styles.sectionHeading}>
                        El proceso creativo en nuestro Atelier
                    </Text>
                    <Text style={styles.processIntro}>
                        Proponemos un flujo claro y transparente para dar vida a tus proyectos textiles
                        y de diseño, desde la primera conversación hasta la prenda terminada.
                    </Text>
                </View>

                <View style={styles.stepsList}>
                    {processSteps.map((step, idx) => (
                        <View key={step.step} style={styles.stepCard}>
                            <View style={styles.stepLeft}>
                                <View style={styles.stepBadge}>
                                    <Text style={styles.stepBadgeText}>{step.step}</Text>
                                </View>
                                {idx < processSteps.length - 1 && <View style={styles.stepConnector} />}
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.stepTitle}>{step.title}</Text>
                                <Text style={styles.stepDescription}>{step.description}</Text>
                            </View>
                        </View>
                    ))}
                </View>

                <View style={styles.processNoteBox}>
                    <Text style={styles.processNoteText}>
                        Nota: Los tiempos, citas de prueba y especificaciones se definen de manera
                        personalizada para cada proyecto, asegurando siempre el mayor nivel de calidad
                        artesanal.
                    </Text>
                </View>
            </View>

            {/* Bottom Invitation Banner */}
            <View style={styles.ctaBanner}>
                <View style={styles.ctaBannerContent}>
                    <Text style={styles.ctaBannerTitle}>
                        Inicia tu experiencia de diseño exclusivo
                    </Text>
                    <Text style={styles.ctaBannerText}>
                        Permítenos conocer tu idea y brindarte una asesoría personalizada en Barranquilla,
                        Colombia.
                    </Text>
                    <TouchableOpacity
                        style={styles.ctaButton}
                        onPress={() => router.push('/contacto')}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.ctaButtonText}>CONTACTAR AL ATELIER</Text>
                        <Text style={styles.ctaButtonArrow}>→</Text>
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
    pillarsSection: {
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
    pillarsGrid: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        width: '100%',
        gap: 24,
    },
    pillarsGridDesktop: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    pillarCard: {
        backgroundColor: '#171411',
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.22)',
        borderRadius: 8,
        padding: 28,
    },
    pillarCardDesktop: {
        width: '31.3%',
    },
    pillarNumber: {
        color: colors.champagneGold,
        fontSize: 20,
        fontWeight: '700',
        fontFamily: typography.serif,
        marginBottom: 10,
    },
    pillarTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: typography.serif,
        fontWeight: '600',
        lineHeight: 24,
        marginBottom: 12,
    },
    pillarLine: {
        width: 32,
        height: 1.5,
        backgroundColor: colors.champagneGold,
        marginBottom: 14,
    },
    pillarDescription: {
        color: '#B5A99B',
        fontSize: 13.5,
        lineHeight: 21,
        fontFamily: typography.sans,
    },
    processSection: {
        backgroundColor: '#13100E',
        paddingVertical: 64,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.2)',
    },
    processIntro: {
        color: '#B5A99B',
        fontSize: 14.5,
        textAlign: 'center',
        maxWidth: 680,
        marginTop: 10,
        fontFamily: typography.sans,
    },
    stepsList: {
        maxWidth: 780,
        marginHorizontal: 'auto',
        width: '100%',
        marginTop: 20,
    },
    stepCard: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 20,
        marginBottom: 4,
    },
    stepLeft: {
        alignItems: 'center',
        width: 80,
    },
    stepBadge: {
        backgroundColor: 'rgba(167, 131, 80, 0.15)',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 4,
    },
    stepBadgeText: {
        color: colors.champagneGold,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
        fontFamily: typography.sans,
    },
    stepConnector: {
        width: 1,
        height: 48,
        backgroundColor: 'rgba(167, 131, 80, 0.3)',
        marginVertical: 6,
    },
    stepContent: {
        flex: 1,
        paddingBottom: 28,
    },
    stepTitle: {
        color: '#FFFFFF',
        fontSize: 17,
        fontFamily: typography.serif,
        fontWeight: '600',
        marginBottom: 6,
    },
    stepDescription: {
        color: '#B5A99B',
        fontSize: 13.5,
        lineHeight: 21,
        fontFamily: typography.sans,
    },
    processNoteBox: {
        maxWidth: 780,
        marginHorizontal: 'auto',
        width: '100%',
        backgroundColor: 'rgba(167, 131, 80, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.25)',
        borderRadius: 6,
        padding: 18,
        marginTop: 16,
    },
    processNoteText: {
        color: '#D4C8B8',
        fontSize: 12.5,
        lineHeight: 19,
        fontFamily: typography.sans,
        textAlign: 'center',
    },
    ctaBanner: {
        backgroundColor: '#171411',
        paddingVertical: 56,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.2)',
        alignItems: 'center',
    },
    ctaBannerContent: {
        maxWidth: 720,
        alignItems: 'center',
        textAlign: 'center',
    },
    ctaBannerTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontFamily: typography.serif,
        marginBottom: 10,
        textAlign: 'center',
    },
    ctaBannerText: {
        color: '#B5A99B',
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
        fontFamily: typography.sans,
    },
    ctaButton: {
        backgroundColor: colors.champagneGold,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 4,
    },
    ctaButtonText: {
        color: '#171411',
        fontSize: 12,
        letterSpacing: 1.8,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    ctaButtonArrow: {
        color: '#171411',
        fontSize: 14,
        fontWeight: '700',
    },
});
