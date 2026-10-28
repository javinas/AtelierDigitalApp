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

interface CreacionLine {
    id: string;
    title: string;
    description: string;
    craftDetails: string;
    image: any;
    contactServiceId: string;
}

export default function CreacionScreen() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 940;

    const creacionLines: CreacionLine[] = [
        {
            id: 'alta-costura',
            title: 'Alta costura y vestidos para toda ocasión',
            description:
                'Diseños y confección para mujer y niña, orientados a ocasiones especiales y necesidades particulares.',
            craftDetails:
                'Patronaje a medida, drapeados minuciosos, forros de seda, costuras invisibles y pruebas dedicadas para un calce impecable.',
            image: require('../assets/service_couture.jpg'),
            contactServiceId: 'alta-costura',
        },
        {
            id: 'primera-comunion',
            title: 'Primera Comunión y pajecitos',
            description:
                'Prendas para ceremonias y celebraciones familiares, con atención a los detalles propios de cada ocasión.',
            craftDetails:
                'Cuidado en tejidos nobles, encajes sutiles, lorzas tradicionales, fajones en seda y cortes cómodos para niños y niñas.',
            image: require('../assets/service_comunion.jpg'),
            contactServiceId: 'primera-comunion',
        },
        {
            id: 'disfraces',
            title: 'Disfraces, colegios y comparsas',
            description:
                'Propuestas de vestuario para colegios, grupos, comparsas y clientes particulares.',
            craftDetails:
                'Confección robusta para movimiento escénico, combinación de texturas brillantes, pedrería y tocados temáticos.',
            image: require('../assets/service_disfraces.jpg'),
            contactServiceId: 'disfraces',
        },
        {
            id: 'carnaval',
            title: 'Carnaval',
            description:
                'Tocados, apliques, zapatos y camisetas relacionados con la expresión festiva y cultural del Carnaval.',
            craftDetails:
                'Artesanía festiva con plumas seleccionadas, pedrería bordada a mano, apliques termo-adheridos y piezas con gran impacto visual.',
            image: require('../assets/service_carnaval.jpg'),
            contactServiceId: 'carnaval',
        },
        {
            id: 'uniformes-dotaciones',
            title: 'Uniformes y dotaciones',
            description:
                'Uniformes para empresas y negocios, además de dotaciones de trabajo y seguridad.',
            craftDetails:
                'Sastrería corporativa y confección industrial con costuras reforzadas, telas antifluido, cintas reflectivas y bordados institucionales.',
            image: require('../assets/service_uniformes.jpg'),
            contactServiceId: 'uniformes',
        },
        {
            id: 'textiles-hogar',
            title: 'Textiles para el hogar',
            description:
                'Ropa de cama, toallas y salidas de baño.',
            craftDetails:
                'Algodones egipcios y tejidos de alto gramaje, festones bordados, iniciales y monogramas personalizados para el confort del hogar.',
            image: require('../assets/service_hogar.jpg'),
            contactServiceId: 'hogar',
        },
        {
            id: 'accesorios-bolsos',
            title: 'Accesorios y bolsos',
            description:
                'Complementos que acompañan distintos estilos y ocasiones.',
            craftDetails:
                'Bolsos de mano, clutches en brocados finos, tocados de cóctel y detalles ornamentales que completan cada estilismo.',
            image: require('../assets/service_accesorios.jpg'),
            contactServiceId: 'accesorios',
        },
    ];

    return (
        <ScrollView
            style={styles.root}
            contentContainerStyle={styles.rootContent}
            showsVerticalScrollIndicator={false}
        >
            <StatusBar style="light" />
            <PublicHeader currentRoute="creacion" />

            {/* Hero Section Editorial */}
            <View style={styles.heroSection}>
                <View style={styles.heroContent}>
                    <Text style={styles.badgeLabel}>PROCESO ARTESANAL · CONFECCIÓN Y DETALLES</Text>
                    <Text style={styles.mainTitle}>
                        Del concepto a la confección.
                    </Text>

                    <Text style={styles.introText}>
                        «Una idea toma forma a través de la selección de materiales, el cuidado de los
                        detalles y el trabajo de confección. Descubre las posibilidades de creación de By
                        Katherine Carroll».
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

            {/* Creation Lines Section */}
            <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTag}>POSIBILIDADES DE CREACIÓN</Text>
                    <Text style={styles.sectionHeading}>
                        Confección experta para cada ocasión y necesidad
                    </Text>
                </View>

                <View style={styles.linesGrid}>
                    {creacionLines.map((line, index) => {
                        return (
                            <View key={line.id} style={styles.lineCard}>
                                <View style={styles.imageBox}>
                                    <Image
                                        source={line.image}
                                        style={styles.lineImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.imageTag}>
                                        <Text style={styles.imageTagText}>0{index + 1}</Text>
                                    </View>
                                </View>

                                <View style={styles.lineBody}>
                                    <Text style={styles.lineTitle}>{line.title}</Text>
                                    <View style={styles.goldLine} />

                                    <Text style={styles.lineDescription}>
                                        {line.description}
                                    </Text>

                                    <View style={styles.craftBox}>
                                        <Text style={styles.craftBoxLabel}>CONFECCIÓN & ACABADOS</Text>
                                        <Text style={styles.craftBoxText}>{line.craftDetails}</Text>
                                    </View>

                                    <TouchableOpacity
                                        style={styles.actionBtn}
                                        onPress={() =>
                                            router.push({
                                                pathname: '/contacto',
                                                params: { servicio: line.contactServiceId },
                                            })
                                        }
                                        activeOpacity={0.88}
                                    >
                                        <Text style={styles.actionBtnText}>SOLICITAR INFORMACIÓN</Text>
                                        <Text style={styles.actionBtnArrow}>→</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        );
                    })}
                </View>
            </View>

            {/* Editorial Quote Box */}
            <View style={styles.quoteBox}>
                <View style={styles.quoteContent}>
                    <Text style={styles.quoteSymbol}>“</Text>
                    <Text style={styles.quoteText}>
                        La confección es el arte de transformar las telas en emociones, cuidando cada
                        puntada para que la prenda responda fielmente a lo que soñaste.
                    </Text>
                    <Text style={styles.quoteAuthor}>BY KATHERINE CARROLL · BARRANQUILLA</Text>
                </View>
            </View>

            {/* Final Contact CTA */}
            <View style={styles.finalCtaSection}>
                <Text style={styles.finalCtaTitle}>¿Tienes un requerimiento de confección?</Text>
                <Text style={styles.finalCtaSubtitle}>
                    Desde vestidos exclusivos hasta dotaciones laborales y textiles para el hogar,
                    estamos listos para escuchar tu necesidad.
                </Text>
                <TouchableOpacity
                    style={styles.goldButton}
                    onPress={() => router.push('/contacto')}
                    activeOpacity={0.88}
                >
                    <Text style={styles.goldButtonText}>IR AL FORMULARIO DE CONSULTA</Text>
                    <Text style={styles.goldButtonArrow}>→</Text>
                </TouchableOpacity>
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
    sectionContainer: {
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
    linesGrid: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        width: '100%',
        gap: 36,
    },
    lineCard: {
        backgroundColor: '#171411',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.22)',
        overflow: 'hidden',
    },
    imageBox: {
        height: 260,
        position: 'relative',
        backgroundColor: '#0F0D0B',
    },
    lineImage: {
        width: '100%',
        height: '100%',
    },
    imageTag: {
        position: 'absolute',
        top: 16,
        left: 16,
        backgroundColor: '#171411',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    imageTagText: {
        color: colors.champagneGold,
        fontSize: 12,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    lineBody: {
        padding: 28,
    },
    lineTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontFamily: typography.serif,
        fontWeight: '600',
        lineHeight: 28,
        marginBottom: 10,
    },
    goldLine: {
        width: 40,
        height: 1.5,
        backgroundColor: colors.champagneGold,
        marginBottom: 16,
    },
    lineDescription: {
        color: '#E8DED1',
        fontSize: 15,
        lineHeight: 23,
        marginBottom: 18,
        fontFamily: typography.sans,
    },
    craftBox: {
        backgroundColor: 'rgba(167, 131, 80, 0.08)',
        borderLeftWidth: 2,
        borderLeftColor: colors.champagneGold,
        paddingVertical: 10,
        paddingHorizontal: 14,
        marginBottom: 24,
    },
    craftBoxLabel: {
        color: colors.champagneGold,
        fontSize: 9.5,
        letterSpacing: 1.5,
        fontWeight: '700',
        marginBottom: 4,
        fontFamily: typography.sans,
    },
    craftBoxText: {
        color: '#B5A99B',
        fontSize: 12.5,
        lineHeight: 18,
        fontFamily: typography.sans,
    },
    actionBtn: {
        backgroundColor: colors.champagneGold,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    actionBtnText: {
        color: '#171411',
        fontSize: 11.5,
        fontWeight: '700',
        letterSpacing: 1.5,
        fontFamily: typography.sans,
    },
    actionBtnArrow: {
        color: '#171411',
        fontSize: 13,
        fontWeight: '700',
    },
    quoteBox: {
        backgroundColor: '#13100E',
        paddingVertical: 48,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.15)',
    },
    quoteContent: {
        maxWidth: 760,
        alignItems: 'center',
    },
    quoteSymbol: {
        color: colors.champagneGold,
        fontSize: 48,
        fontFamily: typography.serif,
        lineHeight: 48,
        marginBottom: 8,
        opacity: 0.8,
    },
    quoteText: {
        color: '#E6D9C8',
        fontSize: 17,
        lineHeight: 28,
        fontFamily: typography.serif,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 16,
    },
    quoteAuthor: {
        color: colors.champagneGold,
        fontSize: 11,
        letterSpacing: 2,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    finalCtaSection: {
        backgroundColor: '#171411',
        paddingVertical: 56,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.2)',
        alignItems: 'center',
    },
    finalCtaTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontFamily: typography.serif,
        marginBottom: 10,
        textAlign: 'center',
    },
    finalCtaSubtitle: {
        color: '#B5A99B',
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        maxWidth: 620,
        marginBottom: 24,
        fontFamily: typography.sans,
    },
    goldButton: {
        backgroundColor: colors.champagneGold,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 4,
    },
    goldButtonText: {
        color: '#171411',
        fontSize: 12,
        letterSpacing: 1.8,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    goldButtonArrow: {
        color: '#171411',
        fontSize: 14,
        fontWeight: '700',
    },
});
