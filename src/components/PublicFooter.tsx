import React from 'react';
import {
    Image,
    Linking,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { colors } from '../theme/colors';
import { typography } from '../theme/typography';

export default function PublicFooter() {
    const { width } = useWindowDimensions();
    const isDesktop = width >= 860;

    const openInstagram = () => {
        Linking.openURL('https://www.instagram.com/carrollkatherine/').catch((err) =>
            console.warn('Error al abrir Instagram:', err)
        );
    };

    return (
        <View style={styles.footerRoot}>
            <View style={styles.container}>
                {/* Brand & Mission Banner */}
                <View style={styles.topBanner}>
                    <View style={styles.brandColumn}>
                        <Image
                            source={require('../../assets/logo_transparent.png')}
                            style={styles.logoImage}
                            resizeMode="contain"
                        />
                        <Text style={styles.brandMotto}>
                            «La creatividad detrás de cada creación»
                        </Text>
                        <Text style={styles.brandDescription}>
                            Atelier de alta costura, diseño a medida y confección textil en
                            Barranquilla, Colombia. Propuestas concebidas con atención al
                            detalle, telas seleccionadas y dedicación artesanal.
                        </Text>
                    </View>

                    {/* Navigation Columns */}
                    <View style={[styles.linksGrid, isDesktop && styles.linksGridDesktop]}>
                        <View style={styles.column}>
                            <Text style={styles.columnTitle}>EXPLORAR</Text>
                            <TouchableOpacity onPress={() => router.push('/')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Inicio</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/diseno')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Diseño</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/creacion')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Creación</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/exclusividad')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Exclusividad</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/servicios')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Servicios</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/contacto')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Contacto</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.column}>
                            <Text style={styles.columnTitle}>LÍNEAS</Text>
                            <TouchableOpacity onPress={() => router.push('/servicios')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Alta Costura & Gala</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/servicios')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Primera Comunión & Pajecitos</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/servicios')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Disfraces & Comparsas</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/servicios')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Carnaval de Barranquilla</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/servicios')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Uniformes & Dotaciones</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/servicios')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Textiles para el Hogar</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.column}>
                            <Text style={styles.columnTitle}>ATELIER DIGITAL</Text>
                            <TouchableOpacity onPress={() => router.push('/(auth)/login')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Iniciar Sesión</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Registro de Clientas</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => router.push('/contacto')} style={styles.linkItem}>
                                <Text style={styles.linkText}>Solicitar Cotización</Text>
                            </TouchableOpacity>

                            <View style={styles.instagramBlock}>
                                <Text style={styles.socialTitle}>REDES OFICIALES</Text>
                                <TouchableOpacity
                                    style={styles.instagramButton}
                                    onPress={openInstagram}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.instagramButtonText}>@carrollkatherine</Text>
                                    <Text style={styles.instagramArrow}>↗</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Flourish Divider */}
                <View style={styles.dividerRow}>
                    <View style={styles.dividerLine} />
                    <Image
                        source={require('../../assets/flourish.png')}
                        style={styles.flourishIcon}
                        resizeMode="contain"
                    />
                    <View style={styles.dividerLine} />
                </View>

                {/* Bottom Bar: Copyright & Location */}
                <View style={[styles.bottomBar, isDesktop && styles.bottomBarDesktop]}>
                    <Text style={styles.copyrightText}>
                        © {new Date().getFullYear()} By Katherine Carroll · Atelier de Autor. Todos los derechos reservados.
                    </Text>
                    <Text style={styles.locationText}>
                        BARRANQUILLA · COLOMBIA
                    </Text>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    footerRoot: {
        backgroundColor: '#13100E',
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.25)',
        paddingTop: 54,
        paddingBottom: 36,
    },
    container: {
        maxWidth: 1360,
        marginHorizontal: 'auto',
        width: '100%',
        paddingHorizontal: 24,
    },
    topBanner: {
        flexDirection: 'column',
        gap: 36,
    },
    brandColumn: {
        maxWidth: 440,
    },
    logoImage: {
        width: 175,
        height: 44,
        marginBottom: 16,
    },
    brandMotto: {
        color: colors.champagneGold,
        fontSize: 14,
        fontFamily: typography.serif,
        fontStyle: 'italic',
        marginBottom: 12,
        letterSpacing: 0.5,
    },
    brandDescription: {
        color: '#9C9185',
        fontSize: 13,
        lineHeight: 20,
        fontFamily: typography.sans,
    },
    linksGrid: {
        flexDirection: 'column',
        gap: 28,
    },
    linksGridDesktop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        flex: 1,
    },
    column: {
        minWidth: 150,
    },
    columnTitle: {
        color: colors.champagneGold,
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 14,
        fontFamily: typography.sans,
    },
    linkItem: {
        paddingVertical: 5,
    },
    linkText: {
        color: '#D4C8B8',
        fontSize: 13,
        fontFamily: typography.sans,
        letterSpacing: 0.3,
    },
    instagramBlock: {
        marginTop: 18,
    },
    socialTitle: {
        color: colors.champagneGold,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 8,
        fontFamily: typography.sans,
    },
    instagramButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(167, 131, 80, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.35)',
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    instagramButtonText: {
        color: '#F8F2E9',
        fontSize: 12,
        fontWeight: '600',
        fontFamily: typography.sans,
    },
    instagramArrow: {
        color: colors.champagneGold,
        fontSize: 12,
    },
    dividerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 36,
        gap: 16,
    },
    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(167, 131, 80, 0.25)',
    },
    flourishIcon: {
        width: 32,
        height: 16,
        opacity: 0.85,
    },
    bottomBar: {
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
    },
    bottomBarDesktop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    copyrightText: {
        color: '#766B62',
        fontSize: 12,
        fontFamily: typography.sans,
        textAlign: 'center',
    },
    locationText: {
        color: colors.champagneGold,
        fontSize: 11,
        letterSpacing: 2,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
});
