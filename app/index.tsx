import React from 'react';
import {
    ActivityIndicator,
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../src/context/AuthContext';
import { colors } from '../src/theme/colors';
import { typography } from '../src/theme/typography';
import PublicFooter from '../src/components/PublicFooter';
import { SERVICES } from '../src/data/servicesData';

export default function HomeScreen() {
    const { session, role, loading, signOut } = useAuth();
    const { width, height: windowHeight } = useWindowDimensions();
    const isDesktop = width >= 940;

    const handleContinue = () => {
        if (role === 'designer') {
            router.push('/(designer)');
        } else {
            router.push('/(client)');
        }
    };

    // 4 servicios destacados para la portada comercial
    const featuredServices = [
        SERVICES.find((s) => s.id === 'alta-costura')!,
        SERVICES.find((s) => s.id === 'carnaval')!,
        SERVICES.find((s) => s.id === 'uniformes')!,
        SERVICES.find((s) => s.id === 'hogar')!,
    ];

    // En escritorio bloqueamos la altura del hero exactamente al alto de pantalla (100vh)
    const heroHeight = isDesktop
        ? Platform.select({
              web: '100vh' as any,
              default: Math.max(windowHeight, 660),
          })
        : undefined;

    return (
        <ScrollView
            style={styles.root}
            contentContainerStyle={styles.rootContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
        >
            <StatusBar style="light" />

            {/* ============================================================== */}
            {/* HERO PRINCIPAL: COMPOSICIÓN EDITORIAL DE DOS PANELES (100VH)   */}
            {/* ============================================================== */}
            <View
                style={[
                    styles.mainContainer,
                    isDesktop && styles.desktopContainer,
                    isDesktop && { height: heroHeight, maxHeight: heroHeight },
                ]}
            >
                {/* ============================================================== */}
                {/* PANEL IZQUIERDO: ALTA COSTURA EDITORIAL (~70% EN ESCRITORIO)  */}
                {/* ============================================================== */}
                <View style={[styles.leftPanel, isDesktop && styles.leftPanelDesktop]}>
                    {/* Fotografía de la modelo y maniquí integrada en el fondo */}
                    <View style={[styles.modelImageWrapper, isDesktop && styles.modelImageWrapperDesktop]}>
                        <Image
                            source={require('../assets/editorial_model_smooth.png')}
                            style={styles.modelImage}
                            resizeMode={isDesktop ? 'cover' : 'contain'}
                        />
                    </View>

                    {/* Capa de contenido editorial sobre el fondo oscuro */}
                    <View style={styles.leftContent}>
                        {/* Cabecera superior: Logotipo + Navegación editorial */}
                        <View style={styles.topHeader}>
                            <View style={styles.brandBox}>
                                <View style={styles.logoPlaque}>
                                    <Image
                                        source={require('../assets/logo_transparent.png')}
                                        style={styles.logoImage}
                                        resizeMode="contain"
                                    />
                                </View>
                                <Text style={styles.brandSubtitle}>ATELIER DIGITAL</Text>
                            </View>

                            {/* Navegación editorial idéntica al diseño de referencia */}
                            <View style={styles.topNav}>
                                <TouchableOpacity
                                    onPress={() => router.push('/diseno')}
                                    activeOpacity={0.7}
                                    style={styles.navTouch}
                                >
                                    <Text style={styles.topNavText}>Diseño</Text>
                                </TouchableOpacity>
                                <Text style={styles.topNavBullet}>·</Text>
                                <TouchableOpacity
                                    onPress={() => router.push('/creacion')}
                                    activeOpacity={0.7}
                                    style={styles.navTouch}
                                >
                                    <Text style={styles.topNavText}>Creación</Text>
                                </TouchableOpacity>
                                <Text style={styles.topNavBullet}>·</Text>
                                <TouchableOpacity
                                    onPress={() => router.push('/exclusividad')}
                                    activeOpacity={0.7}
                                    style={styles.navTouch}
                                >
                                    <Text style={styles.topNavText}>Exclusividad</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Titular Principal y Mensaje de Marca */}
                        <View style={styles.heroTextContainer}>
                            <Text style={styles.mainHeadline}>
                                La creatividad{'\n'}detrás de cada creación.
                            </Text>

                            <Text style={styles.mainDescription}>
                                Un espacio digital para diseñar, crear y acompañar cada prenda
                                con la esencia y el sello de By Katherine Carroll.
                            </Text>

                            {/* Separador de ornamento dorado */}
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

                        {/* Tres Líneas de Especialidad con Iconos Lineales Dorados */}
                        <View style={styles.specialtiesContainer}>
                            <TouchableOpacity
                                style={styles.specialtyCol}
                                onPress={() => router.push('/diseno')}
                                activeOpacity={0.8}
                            >
                                <Image
                                    source={require('../assets/icon_mannequin.png')}
                                    style={styles.specialtyIcon}
                                    resizeMode="contain"
                                />
                                <Text style={styles.specialtyLabel}>
                                    Alta Costura y{'\n'}Vestidos de Ocasión
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.colDivider} />

                            <TouchableOpacity
                                style={styles.specialtyCol}
                                onPress={() => router.push('/creacion')}
                                activeOpacity={0.8}
                            >
                                <Image
                                    source={require('../assets/icon_dress.png')}
                                    style={styles.specialtyIcon}
                                    resizeMode="contain"
                                />
                                <Text style={styles.specialtyLabel}>
                                    Diseño Exclusivo{'\n'}Mujer y Niña
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.colDivider} />

                            <TouchableOpacity
                                style={styles.specialtyCol}
                                onPress={() => router.push('/exclusividad')}
                                activeOpacity={0.8}
                            >
                                <Image
                                    source={require('../assets/icon_sewing.png')}
                                    style={styles.specialtyIcon}
                                    resizeMode="contain"
                                />
                                <Text style={styles.specialtyLabel}>
                                    Detalles de Autor &{'\n'}Textiles Finos
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Pie editorial izquierdo */}
                        <View style={styles.leftFooter}>
                            <View style={styles.leftFooterLine} />
                            <Text style={styles.leftFooterText}>
                                BARRANQUILLA  ·  COLOMBIA      |      @CARROLLKATHERINE
                            </Text>
                        </View>
                    </View>

                    {/* Divisor curvo dorado hacia el panel derecho (en escritorio) */}
                    {isDesktop && (
                        <View style={styles.curvedDividerContainer} pointerEvents="none">
                            <Image
                                source={require('../assets/curved_edge.png')}
                                style={styles.curvedDividerImage}
                                resizeMode="stretch"
                            />
                        </View>
                    )}
                </View>

                {/* ============================================================== */}
                {/* PANEL DERECHO: ACCESO ATELIER DIGITAL (~30% EN ESCRITORIO)     */}
                {/* ============================================================== */}
                <View style={[styles.rightPanel, isDesktop && styles.rightPanelDesktop]}>
                    <View style={styles.rightContent}>
                        <Text style={styles.welcomeTitle}>
                            Bienvenida a{'\n'}nuestro Atelier Digital
                        </Text>

                        <Text style={styles.welcomeSubtitle}>
                            Un espacio exclusivo donde la moda, el diseño y la creatividad
                            se encuentran para hacer realidad tus ideas.
                        </Text>

                        {/* Separador de ornamento dorado */}
                        <View style={styles.rightFlourishRow}>
                            <View style={styles.rightFlourishLine} />
                            <Image
                                source={require('../assets/flourish.png')}
                                style={styles.rightFlourishIcon}
                                resizeMode="contain"
                            />
                            <View style={styles.rightFlourishLine} />
                        </View>

                        {/* Acciones de Entrada */}
                        {loading ? (
                            <View style={styles.loadingBox}>
                                <ActivityIndicator color={colors.champagneGold} size="small" />
                                <Text style={styles.loadingText}>Conectando con el atelier...</Text>
                            </View>
                        ) : session ? (
                            <View style={styles.authContainer}>
                                <View style={styles.sessionBox}>
                                    <Text style={styles.sessionRole}>
                                        SESIÓN ACTIVA · {role === 'designer' ? 'DISEÑADORA' : 'CLIENTA'}
                                    </Text>
                                    <Text style={styles.sessionEmail}>{session.user.email}</Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={handleContinue}
                                    activeOpacity={0.88}
                                >
                                    <Text style={styles.primaryButtonText}>
                                        {role === 'designer'
                                            ? 'CONTINUAR AL ATELIER'
                                            : 'IR A MI ESPACIO DE CLIENTA'}
                                    </Text>
                                    <Text style={styles.buttonArrow}>→</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.logoutLink}
                                    onPress={() => signOut()}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.logoutLinkText}>Cerrar sesión activa</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.buttonsContainer}>
                                <TouchableOpacity
                                    style={styles.primaryButton}
                                    onPress={() => router.push('/(auth)/login')}
                                    activeOpacity={0.88}
                                >
                                    <Text style={styles.primaryButtonText}>INICIAR SESIÓN</Text>
                                    <Text style={styles.buttonArrow}>→</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.secondaryButton}
                                    onPress={() => router.push('/(auth)/register')}
                                    activeOpacity={0.88}
                                >
                                    <Text style={styles.secondaryButtonText}>CREAR CUENTA</Text>
                                    <Text style={styles.secondaryButtonArrow}>→</Text>
                                </TouchableOpacity>

                                <View style={styles.heroLegalLinksRow}>
                                    <Text style={styles.heroLegalNote}>Acceso +18 años · </Text>
                                    <TouchableOpacity
                                        onPress={() => router.push('/terminos-condiciones' as any)}
                                    >
                                        <Text style={styles.heroLegalLink}>Términos</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.heroLegalNote}> · </Text>
                                    <TouchableOpacity
                                        onPress={() => router.push('/politica-privacidad' as any)}
                                    >
                                        <Text style={styles.heroLegalLink}>Privacidad</Text>
                                    </TouchableOpacity>
                                    <Text style={styles.heroLegalNote}> · </Text>
                                    <TouchableOpacity
                                        onPress={() => router.push('/ia-transparencia' as any)}
                                    >
                                        <Text style={styles.heroLegalLink}>Transparencia IA</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Remate inferior: 'Diseño que inspira' con satén original */}
                        <View style={styles.footerSignatureWrapper}>
                            <Image
                                source={require('../assets/diseno_inspira_footer.jpg')}
                                style={styles.signatureImage}
                                resizeMode="contain"
                            />
                        </View>
                    </View>
                </View>
            </View>

            {/* ============================================================== */}
            {/* EXPANSIÓN EDITORIAL: VISIBLE AL HACER SCROLL HACIA ABAJO        */}
            {/* ============================================================== */}
            <View style={styles.editorialIntroSection}>
                <View style={styles.editorialIntroContent}>
                    <Text style={styles.sectionOverline}>ATELIER DE AUTOR · BARRANQUILLA, COLOMBIA</Text>
                    <Text style={styles.editorialHeadline}>
                        Moda, confección y soluciones textiles a medida
                    </Text>
                    <Text style={styles.editorialLeadText}>
                        En By Katherine Carroll, el diseño no se limita a vestidos de gala: abarca un
                        universo creativo que acompaña momentos de vida, celebraciones familiares,
                        la magia del Carnaval, la identidad corporativa de empresas y la calidez del hogar.
                    </Text>

                    <View style={styles.flourishRowCenter}>
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

            {/* TRES PILARES: DISEÑO, CREACIÓN, EXCLUSIVIDAD */}
            <View style={styles.pillarsSection}>
                <View style={[styles.pillarsGrid, isDesktop && styles.pillarsGridDesktop]}>
                    {/* Pilar 1: Diseño */}
                    <View style={[styles.pillarBox, isDesktop && styles.pillarBoxDesktop]}>
                        <Text style={styles.pillarNumber}>01</Text>
                        <Text style={styles.pillarTitle}>Diseño</Text>
                        <View style={styles.pillarGoldLine} />
                        <Text style={styles.pillarText}>
                            Creatividad, asesoría personalizada y propuestas adaptadas a cada silueta y
                            necesidad particular, dando forma a piezas llenas de identidad.
                        </Text>
                        <TouchableOpacity
                            style={styles.pillarLink}
                            onPress={() => router.push('/diseno')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.pillarLinkText}>Descubrir Diseño →</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Pilar 2: Creación */}
                    <View style={[styles.pillarBox, isDesktop && styles.pillarBoxDesktop]}>
                        <Text style={styles.pillarNumber}>02</Text>
                        <Text style={styles.pillarTitle}>Creación</Text>
                        <View style={styles.pillarGoldLine} />
                        <Text style={styles.pillarText}>
                            Confección y elaboración minuciosa de prendas, accesorios y productos textiles
                            con técnicas artesanales y estrictos controles de calidad.
                        </Text>
                        <TouchableOpacity
                            style={styles.pillarLink}
                            onPress={() => router.push('/creacion')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.pillarLinkText}>Descubrir Creación →</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Pilar 3: Exclusividad */}
                    <View style={[styles.pillarBox, isDesktop && styles.pillarBoxDesktop]}>
                        <Text style={styles.pillarNumber}>03</Text>
                        <Text style={styles.pillarTitle}>Exclusividad</Text>
                        <View style={styles.pillarGoldLine} />
                        <Text style={styles.pillarText}>
                            Atención al detalle, selección rigurosa de materiales y propuestas para distintas
                            ocasiones con un proceso creativo guiado de principio a fin.
                        </Text>
                        <TouchableOpacity
                            style={styles.pillarLink}
                            onPress={() => router.push('/exclusividad')}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.pillarLinkText}>Descubrir Exclusividad →</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* SECCIÓN DE SERVICIOS DESTACADOS */}
            <View style={styles.featuredSection}>
                <View style={styles.featuredHeader}>
                    <Text style={styles.sectionOverline}>PROPUESTAS DESTACADAS</Text>
                    <Text style={styles.featuredSectionTitle}>
                        Conoce nuestras líneas de trabajo
                    </Text>
                    <Text style={styles.featuredSectionSubtitle}>
                        Desde piezas de alta costura y tradición cultural hasta confección empresarial y
                        textiles para el hogar.
                    </Text>
                </View>

                <View style={[styles.featuredGrid, isDesktop && styles.featuredGridDesktop]}>
                    {featuredServices.map((service, idx) => (
                        <View
                            key={service.id}
                            style={[styles.featuredCard, isDesktop && styles.featuredCardDesktop]}
                        >
                            <View style={styles.featuredImageWrapper}>
                                <Image
                                    source={service.image}
                                    style={styles.featuredImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.featuredImageTag}>
                                    <Text style={styles.featuredImageTagText}>0{idx + 1}</Text>
                                </View>
                            </View>

                            <View style={styles.featuredBody}>
                                <Text style={styles.featuredCardTitle}>{service.title}</Text>
                                {service.subtitle && (
                                    <Text style={styles.featuredCardSubtitle}>{service.subtitle}</Text>
                                )}
                                <View style={styles.cardGoldLine} />
                                <Text style={styles.featuredCardDesc}>{service.shortDescription}</Text>

                                <TouchableOpacity
                                    style={styles.featuredCta}
                                    onPress={() =>
                                        router.push({
                                            pathname: '/contacto',
                                            params: { servicio: service.id },
                                        })
                                    }
                                    activeOpacity={0.88}
                                >
                                    <Text style={styles.featuredCtaText}>CONSULTAR ESTE SERVICIO</Text>
                                    <Text style={styles.featuredCtaArrow}>→</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>

                {/* Botón para ver el catálogo completo */}
                <View style={styles.viewAllContainer}>
                    <TouchableOpacity
                        style={styles.viewAllButton}
                        onPress={() => router.push('/servicios')}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.viewAllButtonText}>
                            EXPLORAR TODOS LOS SERVICIOS (8 LÍNEAS)
                        </Text>
                        <Text style={styles.viewAllButtonArrow}>→</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* SECCIÓN EDITORIAL DE CONFIDENCIALIDAD, PRIVACIDAD Y TRANSPARENCIA IA */}
            <View style={styles.trustGovernanceSection}>
                <View style={styles.trustGovernanceContainer}>
                    <View style={styles.featuredHeader}>
                        <Text style={styles.sectionOverline}>
                            ÉTICA DE ATELIER · LEY 1581 DE 2012 & TRANSPARENCIA TECNOLÓGICA
                        </Text>
                        <Text style={styles.featuredSectionTitle}>
                            Confidencialidad artesanal e innovación responsable
                        </Text>
                        <Text style={styles.featuredSectionSubtitle}>
                            Cada prenda nace de una relación de confianza. Protegemos rigurosamente
                            sus datos personales y medidas antropométricas, integrando tecnología
                            bajo la supervisión artística directa de Katherine Carroll.
                        </Text>
                    </View>

                    <View style={[styles.trustGrid, isDesktop && styles.trustGridDesktop]}>
                        {/* Tarjeta 1: Custodia de Datos y Medidas */}
                        <View style={[styles.trustCard, isDesktop && styles.trustCardDesktop]}>
                            <View style={styles.trustImageWrapper}>
                                <Image
                                    source={require('../assets/editorial/legal_privacy_custody.jpg')}
                                    style={styles.trustImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.trustAiCaption}>
                                    <Text style={styles.trustAiCaptionText}>
                                        ✦ Fotografía editorial ilustrativa asistida con IA · Atelier By Katherine Carroll
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.trustCardBody}>
                                <Text style={styles.trustCardEyebrow}>
                                    PROTECCIÓN DE DATOS PERSONALES · COLOMBIA
                                </Text>
                                <Text style={styles.trustCardTitle}>
                                    Custodia Reservada de su Expediente y Medidas
                                </Text>
                                <View style={styles.cardGoldLine} />
                                <Text style={styles.trustCardText}>
                                    Las fichas antropométricas, fotografías técnicas de fitting y
                                    datos de contacto se resguardan bajo control de acceso por roles
                                    y políticas Row Level Security (RLS). El registro de cuentas es
                                    exclusivo para mayores de 18 años, garantizando en todo momento
                                    sus derechos de conocer, actualizar, rectificar y suprimir su
                                    información.
                                </Text>
                                <View style={styles.trustLinksRow}>
                                    <TouchableOpacity
                                        style={styles.trustLinkBtn}
                                        onPress={() => router.push('/politica-privacidad' as any)}
                                    >
                                        <Text style={styles.trustLinkBtnText}>
                                            Política de Privacidad →
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.trustLinkBtn}
                                        onPress={() => router.push('/aviso-privacidad' as any)}
                                    >
                                        <Text style={styles.trustLinkBtnText}>
                                            Aviso de Privacidad →
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Tarjeta 2: Transparencia en IA y Términos de Servicio */}
                        <View style={[styles.trustCard, isDesktop && styles.trustCardDesktop]}>
                            <View style={styles.trustImageWrapper}>
                                <Image
                                    source={require('../assets/editorial/legal_atelier_workspace.jpg')}
                                    style={styles.trustImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.trustAiCaption}>
                                    <Text style={styles.trustAiCaptionText}>
                                        ✦ Fotografía editorial ilustrativa asistida con IA · Atelier By Katherine Carroll
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.trustCardBody}>
                                <Text style={styles.trustCardEyebrow}>
                                    DIRECCIÓN HUMANA & GOBERNANZA IA
                                </Text>
                                <Text style={styles.trustCardTitle}>
                                    El Oficio de Alta Costura Apoyado por Tecnología
                                </Text>
                                <View style={styles.cardGoldLine} />
                                <Text style={styles.trustCardText}>
                                    Declaramos con total transparencia el uso de recursos visuales
                                    ilustrativos asistidos por IA y de nuestro copiloto local de
                                    validación geométrica. Ninguna decisión creativa o de calce es
                                    automatizada, ni compartimos fotografías o medidas de clientas
                                    para entrenar modelos externos.
                                </Text>
                                <View style={styles.trustLinksRow}>
                                    <TouchableOpacity
                                        style={styles.trustLinkBtn}
                                        onPress={() => router.push('/ia-transparencia' as any)}
                                    >
                                        <Text style={styles.trustLinkBtnText}>
                                            Política de Transparencia IA →
                                        </Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.trustLinkBtn}
                                        onPress={() => router.push('/terminos-condiciones' as any)}
                                    >
                                        <Text style={styles.trustLinkBtnText}>
                                            Términos y Condiciones →
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            {/* BANNER DE INVITACIÓN DIRECTA */}
            <View style={styles.finalHomeBanner}>
                <View style={styles.finalHomeContent}>
                    <Text style={styles.finalHomeTitle}>
                        ¿Planeas un evento o requieres confección a medida?
                    </Text>
                    <Text style={styles.finalHomeDesc}>
                        Conversa directamente con el atelier para estructurar tu idea, conocer opciones
                        de telas y recibir una asesoría personalizada.
                    </Text>
                    <TouchableOpacity
                        style={styles.finalHomeBtn}
                        onPress={() => router.push('/contacto')}
                        activeOpacity={0.88}
                    >
                        <Text style={styles.finalHomeBtnText}>CONTACTAR AL ATELIER</Text>
                        <Text style={styles.finalHomeBtnArrow}>→</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* PIE DE PÁGINA EDITORIAL COMPARTIDO */}
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
    mainContainer: {
        width: '100%',
        flexDirection: 'column',
    },
    desktopContainer: {
        flexDirection: 'row',
        minHeight: 640,
        overflow: 'hidden',
    },

    /* ================= PANEL IZQUIERDO ================= */
    leftPanel: {
        backgroundColor: '#171411',
        position: 'relative',
        overflow: 'hidden',
        minHeight: 560,
    },
    leftPanelDesktop: {
        flex: 2.3, // ~70% del ancho
        height: '100%',
        maxHeight: '100%',
    },
    modelImageWrapper: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        opacity: 0.95,
        overflow: 'hidden',
    },
    modelImageWrapperDesktop: {
        width: '56%',
        height: '100%',
    },
    modelImage: {
        width: '100%',
        height: '100%',
    },
    leftContent: {
        flex: 1,
        zIndex: 2,
        paddingHorizontal: 36,
        paddingTop: 32,
        paddingBottom: 24,
        justifyContent: 'space-between',
        maxWidth: 720,
        height: '100%',
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    brandBox: {
        alignItems: 'flex-start',
    },
    logoPlaque: {
        backgroundColor: '#171411',
        borderWidth: 1.2,
        borderColor: '#C8A870',
        borderRadius: 8,
        paddingHorizontal: 18,
        paddingVertical: 10,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 8,
        elevation: 4,
    },
    logoImage: {
        width: 175,
        height: 48,
    },
    brandSubtitle: {
        color: '#C8A870',
        fontSize: 10,
        letterSpacing: 4,
        fontWeight: '700',
        marginTop: 8,
        marginLeft: 4,
        fontFamily: typography.sans,
    },
    topNav: {
        paddingTop: 12,
        paddingRight: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    navTouch: {
        paddingVertical: 4,
        paddingHorizontal: 2,
    },
    topNavText: {
        color: '#D8CDC0',
        fontSize: 12,
        letterSpacing: 1.6,
        fontWeight: '400',
        fontFamily: typography.sans,
        opacity: 0.85,
    },
    topNavBullet: {
        color: '#C8A870',
        fontSize: 12,
        opacity: 0.7,
    },
    heroTextContainer: {
        marginVertical: 10,
        maxWidth: 480,
    },
    mainHeadline: {
        color: '#F8F2E9',
        fontSize: 38,
        lineHeight: 46,
        fontWeight: '300',
        fontFamily: typography.serif,
        marginBottom: 14,
        letterSpacing: 0.3,
    },
    mainDescription: {
        color: '#D0C4B6',
        fontSize: 13,
        lineHeight: 21,
        fontFamily: typography.sans,
        maxWidth: 390,
        marginBottom: 18,
    },
    flourishRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '100%',
        maxWidth: 320,
    },
    flourishLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(200, 168, 112, 0.45)',
    },
    flourishIcon: {
        width: 44,
        height: 20,
        marginHorizontal: 10,
        opacity: 0.9,
    },
    specialtiesContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(23, 20, 17, 0.55)',
        borderWidth: 1,
        borderColor: 'rgba(200, 168, 112, 0.25)',
        borderRadius: 4,
        paddingVertical: 12,
        paddingHorizontal: 12,
        maxWidth: 480,
        marginVertical: 10,
    },
    specialtyCol: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 4,
    },
    specialtyIcon: {
        width: 38,
        height: 42,
        marginBottom: 8,
    },
    specialtyLabel: {
        color: '#E6D9C8',
        fontSize: 11,
        lineHeight: 15,
        textAlign: 'center',
        fontFamily: typography.sans,
    },
    colDivider: {
        width: 1,
        height: 44,
        backgroundColor: 'rgba(200, 168, 112, 0.3)',
    },
    leftFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 12,
    },
    leftFooterLine: {
        width: 32,
        height: 1,
        backgroundColor: '#C8A870',
        opacity: 0.7,
    },
    leftFooterText: {
        color: '#C8A870',
        fontSize: 10,
        letterSpacing: 2,
        fontWeight: '600',
        fontFamily: typography.sans,
    },
    curvedDividerContainer: {
        position: 'absolute',
        right: -1,
        top: 0,
        bottom: 0,
        width: 60,
        height: '100%',
        zIndex: 10,
    },
    curvedDividerImage: {
        width: '100%',
        height: '100%',
    },

    /* ================= PANEL DERECHO ================= */
    rightPanel: {
        backgroundColor: '#FAF1E8',
        paddingHorizontal: 32,
        paddingVertical: 36,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
        overflow: 'hidden',
    },
    rightPanelDesktop: {
        flex: 1, // ~30% del ancho
        height: '100%',
        maxHeight: '100%',
    },
    rightContent: {
        width: '100%',
        maxWidth: 320,
        alignItems: 'center',
        zIndex: 2,
    },
    welcomeTitle: {
        color: '#171411',
        fontSize: 27,
        lineHeight: 34,
        fontWeight: '400',
        fontFamily: typography.serif,
        textAlign: 'center',
        marginBottom: 12,
    },
    welcomeSubtitle: {
        color: '#766B62',
        fontSize: 13,
        lineHeight: 20,
        textAlign: 'center',
        fontFamily: typography.sans,
        marginBottom: 18,
    },
    rightFlourishRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 180,
        marginBottom: 24,
    },
    rightFlourishLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(200, 168, 112, 0.5)',
    },
    rightFlourishIcon: {
        width: 36,
        height: 16,
        marginHorizontal: 8,
        opacity: 0.9,
    },
    buttonsContainer: {
        width: '100%',
        gap: 14,
        marginBottom: 18,
    },
    primaryButton: {
        backgroundColor: '#171411',
        borderWidth: 1.2,
        borderColor: '#C8A870',
        borderRadius: 8,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        shadowColor: '#171411',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 6,
        elevation: 2,
    },
    primaryButtonText: {
        color: '#F8F2E9',
        fontSize: 12,
        letterSpacing: 2,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    buttonArrow: {
        color: '#C8A870',
        fontSize: 14,
        marginLeft: 10,
        fontWeight: '600',
    },
    secondaryButton: {
        backgroundColor: '#FAF1E8',
        borderWidth: 1.2,
        borderColor: '#7A6046',
        borderRadius: 8,
        height: 48,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    secondaryButtonText: {
        color: '#171411',
        fontSize: 12,
        letterSpacing: 2,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    secondaryButtonArrow: {
        color: '#7A6046',
        fontSize: 14,
        marginLeft: 10,
        fontWeight: '600',
    },
    heroLegalLinksRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    heroLegalNote: {
        color: '#968A7E',
        fontSize: 10.5,
        fontFamily: typography.sans,
    },
    heroLegalLink: {
        color: '#7A6046',
        fontSize: 10.5,
        fontWeight: '600',
        textDecorationLine: 'underline',
        fontFamily: typography.sans,
    },
    loadingBox: {
        paddingVertical: 20,
        alignItems: 'center',
        gap: 10,
    },
    loadingText: {
        color: '#766B62',
        fontSize: 12,
        fontFamily: typography.sans,
    },
    authContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 12,
    },
    sessionBox: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E6D9C8',
        borderRadius: 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        width: '100%',
        alignItems: 'center',
        marginBottom: 6,
    },
    sessionRole: {
        color: '#C8A870',
        fontSize: 9,
        letterSpacing: 2,
        fontWeight: '700',
        marginBottom: 2,
        fontFamily: typography.sans,
    },
    sessionEmail: {
        color: '#171411',
        fontSize: 12,
        fontWeight: '500',
        fontFamily: typography.sans,
    },
    logoutLink: {
        paddingVertical: 6,
    },
    logoutLinkText: {
        color: '#968A7E',
        fontSize: 11,
        textDecorationLine: 'underline',
        fontFamily: typography.sans,
    },
    footerSignatureWrapper: {
        width: '100%',
        alignItems: 'center',
        marginTop: 14,
    },
    signatureImage: {
        width: 240,
        height: 90,
    },

    /* ================= EXPANSIÓN EDITORIAL ================= */
    editorialIntroSection: {
        backgroundColor: '#191512',
        paddingVertical: 56,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.25)',
        alignItems: 'center',
    },
    editorialIntroContent: {
        maxWidth: 820,
        alignItems: 'center',
        textAlign: 'center',
    },
    sectionOverline: {
        color: colors.champagneGold,
        fontSize: 10.5,
        letterSpacing: 3,
        fontWeight: '700',
        marginBottom: 12,
        fontFamily: typography.sans,
        textAlign: 'center',
    },
    editorialHeadline: {
        color: '#FFFFFF',
        fontSize: 26,
        lineHeight: 34,
        fontFamily: typography.serif,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 14,
    },
    editorialLeadText: {
        color: '#D4C8B8',
        fontSize: 14.5,
        lineHeight: 23,
        fontFamily: typography.sans,
        textAlign: 'center',
        marginBottom: 22,
    },
    flourishRowCenter: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 240,
    },

    /* ================= PILARES ================= */
    pillarsSection: {
        backgroundColor: '#14110E',
        paddingVertical: 52,
        paddingHorizontal: 24,
    },
    pillarsGrid: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        width: '100%',
        gap: 24,
    },
    pillarsGridDesktop: {
        flexDirection: 'row',
    },
    pillarBox: {
        backgroundColor: '#1B1713',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.25)',
        padding: 26,
    },
    pillarBoxDesktop: {
        flex: 1,
    },
    pillarNumber: {
        color: colors.champagneGold,
        fontSize: 18,
        fontWeight: '700',
        fontFamily: typography.serif,
        marginBottom: 8,
    },
    pillarTitle: {
        color: '#FFFFFF',
        fontSize: 19,
        fontFamily: typography.serif,
        fontWeight: '600',
        marginBottom: 10,
    },
    pillarGoldLine: {
        width: 32,
        height: 1.5,
        backgroundColor: colors.champagneGold,
        marginBottom: 12,
    },
    pillarText: {
        color: '#B5A99B',
        fontSize: 13,
        lineHeight: 20,
        marginBottom: 18,
        fontFamily: typography.sans,
    },
    pillarLink: {
        alignSelf: 'flex-start',
    },
    pillarLinkText: {
        color: colors.champagneGold,
        fontSize: 11.5,
        letterSpacing: 1,
        fontWeight: '700',
        fontFamily: typography.sans,
    },

    /* ================= SERVICIOS DESTACADOS ================= */
    featuredSection: {
        backgroundColor: '#191512',
        paddingVertical: 56,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.2)',
    },
    featuredHeader: {
        maxWidth: 820,
        marginHorizontal: 'auto',
        width: '100%',
        alignItems: 'center',
        marginBottom: 36,
    },
    featuredSectionTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontFamily: typography.serif,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 8,
    },
    featuredSectionSubtitle: {
        color: '#B5A99B',
        fontSize: 14,
        textAlign: 'center',
        fontFamily: typography.sans,
    },
    featuredGrid: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        width: '100%',
        gap: 24,
    },
    featuredGridDesktop: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    featuredCard: {
        backgroundColor: '#14110E',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.22)',
        overflow: 'hidden',
    },
    featuredCardDesktop: {
        width: '48.5%',
    },
    featuredImageWrapper: {
        height: 200,
        position: 'relative',
        backgroundColor: '#0F0D0B',
    },
    featuredImage: {
        width: '100%',
        height: '100%',
    },
    featuredImageTag: {
        position: 'absolute',
        top: 12,
        right: 12,
        backgroundColor: '#171411',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    featuredImageTagText: {
        color: colors.champagneGold,
        fontSize: 11,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    featuredBody: {
        padding: 22,
        flex: 1,
        justifyContent: 'space-between',
    },
    featuredCardTitle: {
        color: '#FFFFFF',
        fontSize: 18,
        fontFamily: typography.serif,
        fontWeight: '600',
        marginBottom: 4,
    },
    featuredCardSubtitle: {
        color: colors.champagneGold,
        fontSize: 12,
        letterSpacing: 0.5,
        marginBottom: 10,
        fontFamily: typography.sans,
    },
    cardGoldLine: {
        width: 32,
        height: 1.5,
        backgroundColor: colors.champagneGold,
        marginBottom: 10,
    },
    featuredCardDesc: {
        color: '#D4C8B8',
        fontSize: 13,
        lineHeight: 19,
        marginBottom: 18,
        fontFamily: typography.sans,
    },
    featuredCta: {
        backgroundColor: colors.champagneGold,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 10,
        borderRadius: 4,
    },
    featuredCtaText: {
        color: '#171411',
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 1.2,
        fontFamily: typography.sans,
    },
    featuredCtaArrow: {
        color: '#171411',
        fontSize: 12,
        fontWeight: '700',
    },
    viewAllContainer: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        width: '100%',
        alignItems: 'center',
        marginTop: 36,
    },
    viewAllButton: {
        borderWidth: 1.2,
        borderColor: colors.champagneGold,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 4,
        backgroundColor: 'rgba(167, 131, 80, 0.08)',
    },
    viewAllButtonText: {
        color: '#F8F2E9',
        fontSize: 11.5,
        letterSpacing: 2,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    viewAllButtonArrow: {
        color: colors.champagneGold,
        fontSize: 13,
        fontWeight: '700',
    },

    /* ================= SECCIÓN CONFIDENCIALIDAD Y GOBERNANZA IA ================= */
    trustGovernanceSection: {
        backgroundColor: '#14110E',
        paddingVertical: 56,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.22)',
    },
    trustGovernanceContainer: {
        maxWidth: 1200,
        marginHorizontal: 'auto',
        width: '100%',
    },
    trustGrid: {
        flexDirection: 'column',
        gap: 24,
    },
    trustGridDesktop: {
        flexDirection: 'row',
    },
    trustCard: {
        backgroundColor: '#1B1713',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.25)',
        overflow: 'hidden',
    },
    trustCardDesktop: {
        flex: 1,
    },
    trustImageWrapper: {
        height: 210,
        backgroundColor: '#0F0D0B',
        position: 'relative',
    },
    trustImage: {
        width: '100%',
        height: '100%',
    },
    trustAiCaption: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(23, 20, 17, 0.85)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.35)',
    },
    trustAiCaptionText: {
        color: '#D4C8B8',
        fontSize: 10,
        fontStyle: 'italic',
        fontFamily: typography.sans,
    },
    trustCardBody: {
        padding: 24,
    },
    trustCardEyebrow: {
        color: colors.champagneGold,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 6,
        fontFamily: typography.sans,
    },
    trustCardTitle: {
        color: '#FFFFFF',
        fontSize: 19,
        lineHeight: 25,
        fontFamily: typography.serif,
        fontWeight: '600',
        marginBottom: 10,
    },
    trustCardText: {
        color: '#D4C8B8',
        fontSize: 13,
        lineHeight: 20,
        fontFamily: typography.sans,
        marginBottom: 18,
    },
    trustLinksRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    trustLinkBtn: {
        paddingVertical: 4,
    },
    trustLinkBtnText: {
        color: colors.champagneGold,
        fontSize: 11.5,
        fontWeight: '700',
        letterSpacing: 0.8,
        fontFamily: typography.sans,
    },

    /* ================= BANNER FINAL HOME ================= */
    finalHomeBanner: {
        backgroundColor: '#120F0D',
        paddingVertical: 56,
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(167, 131, 80, 0.25)',
        alignItems: 'center',
    },
    finalHomeContent: {
        maxWidth: 720,
        alignItems: 'center',
        textAlign: 'center',
    },
    finalHomeTitle: {
        color: '#FFFFFF',
        fontSize: 22,
        fontFamily: typography.serif,
        fontWeight: '600',
        marginBottom: 10,
        textAlign: 'center',
    },
    finalHomeDesc: {
        color: '#B5A99B',
        fontSize: 14,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 22,
        fontFamily: typography.sans,
    },
    finalHomeBtn: {
        backgroundColor: colors.champagneGold,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 12,
        paddingHorizontal: 28,
        borderRadius: 4,
    },
    finalHomeBtnText: {
        color: '#171411',
        fontSize: 11.5,
        letterSpacing: 1.8,
        fontWeight: '700',
        fontFamily: typography.sans,
    },
    finalHomeBtnArrow: {
        color: '#171411',
        fontSize: 13,
        fontWeight: '700',
    },
});
