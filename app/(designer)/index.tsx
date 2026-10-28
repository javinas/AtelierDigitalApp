import React from 'react';
import {
    Image,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useAuth } from '../../src/context/AuthContext';
import { colors } from '../../src/theme/colors';
import { typography } from '../../src/theme/typography';

// Fotografías editoriales de la Casa de Alta Costura
const HERO_IMAGE = require('../../assets/service_couture.jpg');
const JACKET_IMAGE = require('../../assets/garments/jacket.jpg');
const CARD_CLIENTS = require('../../assets/cards/card_clients.jpg');
const CARD_CREATIONS = require('../../assets/cards/card_creations.jpg');
const CARD_PATTERNS = require('../../assets/cards/card_patterns.jpg');
const CARD_CAD_BANK = require('../../assets/cards/card_cad_bank.jpg');
const CARD_SECURITY = require('../../assets/cards/card_security.jpg');
const CARD_FABRICS = require('../../assets/cards/card_fabrics.jpg');
const CARD_FITTING = require('../../assets/cards/card_fitting.jpg');

export default function DesignerHomeScreen() {
    const { user, profile, signOut } = useAuth();
    const { width } = useWindowDimensions();

    const handleSignOut = async () => {
        await signOut();
    };

    const displayName = profile?.full_name || user?.user_metadata?.full_name || 'Diseñadora';
    const displayEmail = profile?.email || user?.email || '';

    // Breakpoints responsivos editoriales
    // - Desktop amplio: width >= 1120px (4 columnas en experiencias de trabajo, 3 en secundarias)
    // - Tablet / Desktop compacto: 720px <= width < 1120px (2 columnas fluidas con amplio respiro)
    // - Móvil: width < 720px (1 columna fluida al 100%)
    const isMobile = width < 720;
    const isTablet = width >= 720 && width < 1120;
    const isDesktop = width >= 1120;

    // Grid "¿Qué quieres hacer hoy?" (4 experiencias visuales)
    const workExperienceGridStyle = [
        styles.workGrid,
        Platform.OS === 'web' && {
            display: 'grid',
            gridTemplateColumns: isDesktop
                ? 'repeat(4, minmax(0, 1fr))'
                : isTablet
                ? 'repeat(2, minmax(0, 1fr))'
                : '1fr',
            gap: 20,
            alignItems: 'stretch',
        } as any,
    ];

    // Grid de Información Secundaria (3 columnas en desktop, 2 en tablet, 1 en mobile)
    const secondaryGridStyle = [
        styles.secondaryGrid,
        Platform.OS === 'web' && {
            display: 'grid',
            gridTemplateColumns: isDesktop
                ? 'repeat(3, minmax(0, 1fr))'
                : isTablet
                ? 'repeat(2, minmax(0, 1fr))'
                : '1fr',
            gap: 20,
            alignItems: 'stretch',
        } as any,
    ];

    return (
        <View style={styles.container}>
            <StatusBar style="dark" />

            {/* ============================================================== */}
            {/* 1. HEADER EDITORIAL — Entrada Digital de la Casa de Autor       */}
            {/* ============================================================== */}
            <View style={styles.headerWrapper} accessibilityRole="header">
                <View style={[styles.headerInner, isMobile && styles.headerInnerMobile]}>
                    <View style={styles.brandBox}>
                        <View style={styles.monogramRow}>
                            <Text style={styles.goldStar}>✦</Text>
                            <Text style={styles.brandEyebrow}>BY KATHERINE CARROLL</Text>
                        </View>
                        <Text style={styles.brandTitle}>ATELIER DIGITAL</Text>
                        <Text style={styles.brandSubtitle}>Atelier de Autor · Alta Costura & Sastrería</Text>
                    </View>

                    <View style={[styles.userSection, isMobile && styles.userSectionMobile]}>
                        <View style={styles.userProfileInfo}>
                            <View style={styles.avatarCircle}>
                                <Text style={styles.avatarText}>
                                    {displayName.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.userTextCol}>
                                <View style={styles.rolePill}>
                                    <Text style={styles.rolePillText}>DISEÑADORA</Text>
                                </View>
                                <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
                                {displayEmail ? (
                                    <Text style={styles.userEmail} numberOfLines={1}>{displayEmail}</Text>
                                ) : null}
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.signOutButton}
                            onPress={handleSignOut}
                            activeOpacity={0.8}
                            accessibilityLabel="Cerrar sesión"
                        >
                            <Text style={styles.signOutButtonText}>Cerrar Sesión</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* ============================================================== */}
                {/* 2. HERO PRINCIPAL ASIMÉTRICO — Lujo, Autoría & Alta Costura    */}
                {/* ============================================================== */}
                <View style={styles.heroCard}>
                    <View style={[styles.heroLayout, isMobile && styles.heroLayoutMobile]}>
                        {/* Columna de Texto Editorial */}
                        <View style={[styles.heroTextCol, isMobile && styles.heroTextColMobile]}>
                            <View style={styles.heroPrebadge}>
                                <Text style={styles.heroPrebadgeStar}>✦</Text>
                                <Text style={styles.heroPrebadgeText}>BY KATHERINE CARROLL · ATELIER DIGITAL</Text>
                            </View>

                            <Text style={[styles.heroHeadline, isMobile && styles.heroHeadlineMobile]}>
                                El arte de crear prendas que llevan tu firma.
                            </Text>

                            <Text style={styles.heroSubtitle}>
                                Diseño, medidas, patronaje, fitting y creación. Todo el universo de tu atelier, reunido en un solo lugar.
                            </Text>

                            <View style={styles.heroDividerLine} />

                            <View style={styles.heroGreetingRow}>
                                <Text style={styles.heroGreetingLabel}>BIENVENIDA AL ATELIER</Text>
                                <Text style={styles.heroGreetingName}>{displayName}</Text>
                            </View>

                            <View style={styles.sessionStatusBadge}>
                                <View style={styles.greenPulseDot} />
                                <Text style={styles.sessionStatusText}>
                                    Sesión autenticada en Supabase · Privilegios de Diseñadora activos
                                </Text>
                            </View>
                        </View>

                        {/* Columna Fotográfica Dominante */}
                        <View style={[styles.heroImageCol, isMobile && styles.heroImageColMobile]}>
                            <View style={styles.imageFrame}>
                                <Image
                                    source={HERO_IMAGE}
                                    style={styles.heroImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.imageOverlayGradient}>
                                    <View style={styles.imageOverlayTopBar}>
                                        <Text style={styles.imageCaptionBrand}>ATELIER DE ALTA COSTURA</Text>
                                        <Text style={styles.imageCaptionDot}>✦</Text>
                                    </View>
                                    <Text style={styles.imageCaptionAuthor}>Katherine Carroll · Haute Couture</Text>
                                    <Text style={styles.imageCaptionSub}>Confección artesanal · Piezas de autor</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ============================================================== */}
                {/* 3. “¿QUÉ QUIERES HACER HOY?” — 4 EXPERIENCIAS PRINCIPALES      */}
                {/* ============================================================== */}
                <View style={styles.sectionHeader}>
                    <View style={styles.sectionHeaderLine} />
                    <View style={styles.sectionHeaderTitleBox}>
                        <Text style={styles.sectionEyebrow}>✦ EXPERIENCIAS DE TRABAJO</Text>
                        <Text style={styles.sectionTitle}>¿Qué quieres hacer hoy?</Text>
                        <Text style={styles.sectionSubtitle}>
                            Explora cada dimensión del atelier: desde el registro de la clienta y el diseño a medida, hasta la ingeniería del patrón y el archivo histórico.
                        </Text>
                    </View>
                    <View style={styles.sectionHeaderLine} />
                </View>

                {/* 4 Experiencias Visuales Editoriales */}
                <View style={workExperienceGridStyle}>
                    {/* 1. CLIENTAS */}
                    <View style={[styles.experienceCard, isDesktop ? styles.colFourth : isTablet ? styles.colHalf : styles.colFull]}>
                        <View style={styles.experienceImageWrapper}>
                            <Image
                                source={CARD_CLIENTS}
                                style={styles.experienceImage}
                                resizeMode="cover"
                            />
                            <View style={styles.experienceImageDimmer} />
                            <View style={styles.experienceTag}>
                                <Text style={styles.experienceTagText}>EXPEDIENTES & MEDIDAS</Text>
                            </View>
                        </View>

                        <View style={styles.experienceBody}>
                            <View style={styles.experienceTextTop}>
                                <View style={styles.cardWatermarkRow}>
                                    <Text style={styles.cardWatermarkText}>01</Text>
                                </View>
                                <Text style={styles.experienceTitle}>CLIENTAS</Text>
                                <Text style={styles.experienceTagline}>
                                    “Conoce sus medidas, preferencias e historia.”
                                </Text>
                                <Text style={styles.experienceSummary}>
                                    Directorio confidencial, toma histórica de medidas anatómicas en cm y notas de ajuste personalizadas.
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => router.push('/(designer)/clients')}
                                style={styles.experienceButton}
                                activeOpacity={0.88}
                                accessibilityLabel="Entrar a Clientas"
                            >
                                <Text style={styles.experienceButtonText}>ENTRAR</Text>
                                <Text style={styles.experienceButtonArrow}>→</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 2. CREACIONES */}
                    <View style={[styles.experienceCard, isDesktop ? styles.colFourth : isTablet ? styles.colHalf : styles.colFull]}>
                        <View style={styles.experienceImageWrapper}>
                            <Image
                                source={CARD_CREATIONS}
                                style={styles.experienceImage}
                                resizeMode="cover"
                            />
                            <View style={styles.experienceImageDimmer} />
                            <View style={styles.experienceTag}>
                                <Text style={styles.experienceTagText}>PROYECTOS & FITTING</Text>
                            </View>
                        </View>

                        <View style={styles.experienceBody}>
                            <View style={styles.experienceTextTop}>
                                <View style={styles.cardWatermarkRow}>
                                    <Text style={styles.cardWatermarkText}>02</Text>
                                </View>
                                <Text style={styles.experienceTitle}>CREACIONES</Text>
                                <Text style={styles.experienceTagline}>
                                    “Convierte una idea en una prenda única.”
                                </Text>
                                <Text style={styles.experienceSummary}>
                                    Encargos a medida, vinculación canónica de clientas, diagnóstico ontológico y cierre de ficha técnica.
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => router.push('/(designer)/creations')}
                                style={styles.experienceButton}
                                activeOpacity={0.88}
                                accessibilityLabel="Explorar Creaciones"
                            >
                                <Text style={styles.experienceButtonText}>EXPLORAR</Text>
                                <Text style={styles.experienceButtonArrow}>→</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 3. PATRONAJE (Módulo 02 · Motor CAD & Experiencias de Patronaje) */}
                    <View style={[styles.experienceCard, styles.experienceCardFeatured, isDesktop ? styles.colFourth : isTablet ? styles.colHalf : styles.colFull]}>
                        <TouchableOpacity
                            onPress={() => router.push({ pathname: '/(designer)/patterns', params: { workflow: 'hub' } })}
                            activeOpacity={0.88}
                            style={styles.experienceImageWrapper}
                            accessibilityLabel="Abrir Módulo 02 de Patronaje"
                        >
                            <Image
                                source={CARD_PATTERNS}
                                style={styles.experienceImage}
                                resizeMode="cover"
                            />
                            <View style={styles.experienceImageDimmer} />
                            <View style={[styles.experienceTag, styles.experienceTagGold]}>
                                <Text style={styles.experienceTagGoldText}>✦ MOTOR CAD · 16 PIEZAS</Text>
                            </View>
                        </TouchableOpacity>

                        <View style={styles.experienceBody}>
                            <View style={styles.experienceTextTop}>
                                <View style={styles.cardWatermarkRow}>
                                    <Text style={styles.cardWatermarkGold}>03 ✦</Text>
                                </View>
                                <Text style={[styles.experienceTitle, styles.experienceTitleGold]}>PATRONAJE</Text>
                                <Text style={styles.experienceTaglineGold}>
                                    “Transforma medidas y diseño en geometría.”
                                </Text>
                                <Text style={styles.experienceSummary}>
                                    Trazado paramétrico determinístico, visor 2D en mesa CAD, 11 criterios de corte y exportación física 1:1.
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => router.push({ pathname: '/(designer)/patterns', params: { workflow: 'hub' } })}
                                style={styles.experienceButtonFeatured}
                                activeOpacity={0.9}
                                accessibilityLabel="Abrir Módulo 02 de Patronaje"
                            >
                                <Text style={styles.experienceButtonFeaturedText}>ABRIR</Text>
                                <Text style={styles.experienceButtonFeaturedArrow}>→</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* 4. BANCO DE PATRONES */}
                    <View style={[styles.experienceCard, isDesktop ? styles.colFourth : isTablet ? styles.colHalf : styles.colFull]}>
                        <View style={styles.experienceImageWrapper}>
                            <Image
                                source={CARD_CAD_BANK}
                                style={styles.experienceImage}
                                resizeMode="cover"
                            />
                            <View style={styles.experienceImageDimmer} />
                            <View style={styles.experienceTag}>
                                <Text style={styles.experienceTagText}>BIBLIOTECA TÉCNICA</Text>
                            </View>
                        </View>

                        <View style={styles.experienceBody}>
                            <View style={styles.experienceTextTop}>
                                <View style={styles.cardWatermarkRow}>
                                    <Text style={styles.cardWatermarkText}>04</Text>
                                </View>
                                <Text style={styles.experienceTitle}>BANCO DE PATRONES</Text>
                                <Text style={styles.experienceTagline}>
                                    “Tu biblioteca técnica de conocimiento y experiencia.”
                                </Text>
                                <Text style={styles.experienceSummary}>
                                    Catálogo histórico de patrones generados, linaje inmutable de revisiones y exportación física en SVG/DXF.
                                </Text>
                            </View>

                            <TouchableOpacity
                                onPress={() => router.push('/(designer)/pattern-bank')}
                                style={styles.experienceButton}
                                activeOpacity={0.88}
                                accessibilityLabel="Explorar Banco de Patrones"
                            >
                                <Text style={styles.experienceButtonText}>EXPLORAR</Text>
                                <Text style={styles.experienceButtonArrow}>→</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* ============================================================== */}
                {/* 4. “CONTINUAR EN EL ATELIER” — Mesa de Trabajo Activa          */}
                {/* ============================================================== */}
                <View style={styles.workbenchWrap}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.sectionHeaderLine} />
                        <View style={styles.sectionHeaderTitleBox}>
                            <Text style={styles.sectionEyebrow}>✦ MESA DE TRABAJO ACTIVA</Text>
                            <Text style={styles.sectionTitle}>Continuar en el Atelier</Text>
                            <Text style={styles.sectionSubtitle}>
                                Retoma tu última creación exactamente en el punto de confección donde la dejaste.
                            </Text>
                        </View>
                        <View style={styles.sectionHeaderLine} />
                    </View>

                    {/* Pieza Editorial Destacada de Mesa de Trabajo */}
                    <View style={styles.workbenchCard}>
                        <View style={[styles.workbenchLayout, isMobile && styles.workbenchLayoutMobile]}>
                            {/* Fotografía de la prenda en taller (jacket.jpg) */}
                            <View style={[styles.workbenchImageCol, isMobile && styles.workbenchImageColMobile]}>
                                <Image
                                    source={JACKET_IMAGE}
                                    style={styles.workbenchImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.workbenchImageBadge}>
                                    <Text style={styles.workbenchImageBadgeText}>EN PROCESO · FITTING ACTIVO</Text>
                                </View>
                            </View>

                            {/* Expediente técnico de avance */}
                            <View style={[styles.workbenchContentCol, isMobile && styles.workbenchContentColMobile]}>
                                <View style={styles.workbenchTopRow}>
                                    <View style={styles.workbenchPill}>
                                        <Text style={styles.workbenchPillText}>ENCARGO A MEDIDA · ALTA COSTURA</Text>
                                    </View>
                                    <Text style={styles.workbenchWatermark}>v1.1</Text>
                                </View>

                                <Text style={styles.workbenchPieceTitle}>Chaqueta Sastre de Prueba C15</Text>
                                <Text style={styles.workbenchPieceSubtitle}>
                                    Laura Martínez · Patrón Paramétrico v1.1
                                </Text>

                                <View style={styles.workbenchGridDetails}>
                                    <View style={styles.workbenchDetailItem}>
                                        <Text style={styles.workbenchDetailLabel}>CLIENTA</Text>
                                        <Text style={styles.workbenchDetailValue}>Laura Martínez</Text>
                                        <Text style={styles.workbenchDetailSub}>Expediente #LM-04 · Medidas confirmadas</Text>
                                    </View>
                                    <View style={styles.workbenchDetailItem}>
                                        <Text style={styles.workbenchDetailLabel}>ETAPA ACTUAL</Text>
                                        <Text style={styles.workbenchDetailValue}>05 · Fitting sobre Glasilla (Toile)</Text>
                                        <Text style={styles.workbenchDetailSub}>Pines activos en hombro y entalle</Text>
                                    </View>
                                    <View style={styles.workbenchDetailItemFull}>
                                        <Text style={styles.workbenchDetailLabel}>ÚLTIMO AVANCE</Text>
                                        <Text style={styles.workbenchDetailValue}>
                                            16 piezas geométricas generadas · Auditoría de corte aprobada (11/11 criterios)
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.workbenchActionsRow}>
                                    <TouchableOpacity
                                        onPress={() => router.push('/(designer)/patterns')}
                                        style={styles.workbenchPrimaryButton}
                                        activeOpacity={0.88}
                                        accessibilityLabel="Continuar en el Motor de Patronaje"
                                    >
                                        <Text style={styles.workbenchPrimaryButtonText}>CONTINUAR</Text>
                                        <Text style={styles.workbenchPrimaryButtonArrow}>→</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        onPress={() => router.push('/(designer)/creations')}
                                        style={styles.workbenchSecondaryButton}
                                        activeOpacity={0.85}
                                        accessibilityLabel="Abrir expediente de creación"
                                    >
                                        <Text style={styles.workbenchSecondaryButtonText}>Ver Expediente</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ============================================================== */}
                {/* 5. MANIFIESTO EDITORIAL — Franja Oscura                        */}
                {/* ============================================================== */}
                <View style={styles.manifestoBand}>
                    <View style={styles.manifestoInner}>
                        <View style={styles.manifestoIconRow}>
                            <Text style={styles.manifestoGoldStar}>✦</Text>
                            <Text style={styles.manifestoGoldStar}>✦</Text>
                            <Text style={styles.manifestoGoldStar}>✦</Text>
                        </View>

                        <Text style={styles.manifestoLineOne}>Cada medida cuenta.</Text>
                        <Text style={styles.manifestoLineTwo}>Cada línea tiene intención.</Text>
                        <Text style={styles.manifestoLineThree}>Cada prenda lleva tu firma.</Text>

                        <View style={styles.manifestoSignatureRow}>
                            <View style={styles.manifestoRule} />
                            <Text style={styles.manifestoAuthor}>KATHERINE CARROLL · HAUTE COUTURE</Text>
                            <View style={styles.manifestoRule} />
                        </View>
                    </View>
                </View>

                {/* ============================================================== */}
                {/* 6. INFORMACIÓN SECUNDARIA — Tratamiento Ligero/Editorial       */}
                {/* ============================================================== */}
                <View style={styles.subordinatedSectionWrap}>
                    <View style={styles.subordinatedHeader}>
                        <Text style={styles.subordinatedEyebrow}>✦ INFRAESTRUCTURA & PRÓXIMAS FASES</Text>
                        <Text style={styles.subordinatedTitle}>Servicios de Soporte & Futuras Fases</Text>
                        <Text style={styles.subordinatedSubtitle}>
                            Infraestructura técnica activa y módulos en fase de desarrollo de taller.
                        </Text>
                    </View>

                    <View style={secondaryGridStyle}>
                        {/* FUNDACIÓN & SEGURIDAD */}
                        <View style={[styles.subordinatedCard, isDesktop ? styles.colThird : isTablet ? styles.colHalf : styles.colFull]}>
                            <View style={styles.subordinatedImageWrapper}>
                                <Image
                                    source={CARD_SECURITY}
                                    style={styles.subordinatedImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.experienceImageDimmer} />
                                <View style={styles.experienceTag}>
                                    <Text style={styles.experienceTagText}>SISTEMA & ACCESO</Text>
                                </View>
                            </View>
                            <View style={styles.subordinatedBody}>
                                <View>
                                    <Text style={styles.subordinatedCardTitle}>Fundación & Seguridad</Text>
                                    <Text style={styles.subordinatedCardText}>
                                        Autenticación de dos roles en Supabase, políticas Row-Level Security (RLS) y credenciales de taller activas.
                                    </Text>
                                </View>
                                <View style={styles.securityCheckBadge}>
                                    <Text style={styles.securityCheckIcon}>✓</Text>
                                    <Text style={styles.securityCheckText}>Infraestructura protegida en Supabase</Text>
                                </View>
                            </View>
                        </View>

                        {/* MÓDULO 03: DISEÑOS, CREACIONES & TELAS */}
                        <View style={[styles.subordinatedCard, styles.subordinatedCardDashed, isDesktop ? styles.colThird : isTablet ? styles.colHalf : styles.colFull]}>
                            <View style={styles.subordinatedImageWrapper}>
                                <Image
                                    source={CARD_FABRICS}
                                    style={styles.subordinatedImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.experienceImageDimmer} />
                                <View style={styles.experienceTag}>
                                    <Text style={styles.experienceTagText}>PRÓXIMO · MÓDULO 03</Text>
                                </View>
                            </View>
                            <View style={styles.subordinatedBody}>
                                <View>
                                    <Text style={styles.subordinatedCardTitle}>Diseños, Creaciones & Telas</Text>
                                    <Text style={styles.subordinatedCardText}>
                                        Muestrario textil de alta costura, catálogo de tejidos nobles, figurines y memorias de diseño de autor.
                                    </Text>
                                </View>
                                <View style={styles.upcomingBadgeRow}>
                                    <Text style={styles.upcomingDot}>◌</Text>
                                    <Text style={styles.upcomingText}>En fase de conceptualización</Text>
                                </View>
                            </View>
                        </View>

                        {/* PRUEBAS & ENTREGAS */}
                        <View style={[styles.subordinatedCard, styles.subordinatedCardDashed, isDesktop ? styles.colThird : isTablet ? styles.colHalf : styles.colFull]}>
                            <View style={styles.subordinatedImageWrapper}>
                                <Image
                                    source={CARD_FITTING}
                                    style={styles.subordinatedImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.experienceImageDimmer} />
                                <View style={styles.experienceTag}>
                                    <Text style={styles.experienceTagText}>PRÓXIMO</Text>
                                </View>
                            </View>
                            <View style={styles.subordinatedBody}>
                                <View>
                                    <Text style={styles.subordinatedCardTitle}>Pruebas & Entregas</Text>
                                    <Text style={styles.subordinatedCardText}>
                                        Agenda de fitting sobre glasilla (toile), seguimiento de correcciones en cuerpo real y ceremonial de entrega.
                                    </Text>
                                </View>
                                <View style={styles.upcomingBadgeRow}>
                                    <Text style={styles.upcomingDot}>◌</Text>
                                    <Text style={styles.upcomingText}>En fase de planificación</Text>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* ============================================================== */}
                {/* 7. FOOTER EDITORIAL SOBRIO                                     */}
                {/* ============================================================== */}
                <View style={styles.footerContainer}>
                    <View style={styles.footerLine} />
                    <View style={styles.footerContent}>
                        <Text style={styles.footerStar}>✦</Text>
                        <Text style={styles.footerBrand}>ATELIER DIGITAL</Text>
                        <Text style={styles.footerAuthor}>Atelier de Autor · By Katherine Carroll</Text>
                        <Text style={styles.footerTagline}>
                            Sistema Especializado de Alta Costura, Medidas & Patronaje Paramétrico
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background, // #F8F2E9
    },

    // 1. Header Editorial
    headerWrapper: {
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    headerInner: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: Platform.OS === 'web' ? 20 : 44,
        paddingBottom: 20,
        maxWidth: 1280,
        width: '100%',
        alignSelf: 'center',
    },
    headerInnerMobile: {
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 16,
        paddingHorizontal: 20,
        paddingTop: 36,
        paddingBottom: 16,
    },
    brandBox: {
        justifyContent: 'center',
    },
    monogramRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    goldStar: {
        color: colors.champagneGold,
        fontSize: 10,
    },
    brandEyebrow: {
        color: colors.champagneGold,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    },
    brandTitle: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 22,
        fontWeight: '600',
        letterSpacing: 1.5,
    },
    brandSubtitle: {
        color: colors.textSecondary,
        fontSize: 11,
        letterSpacing: 0.5,
        marginTop: 2,
    },
    userSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    userSectionMobile: {
        width: '100%',
        justifyContent: 'space-between',
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.sand,
    },
    userProfileInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatarCircle: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: colors.atelierBlack,
        borderWidth: 1.5,
        borderColor: colors.champagneGold,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: colors.ivoryWarm,
        fontSize: 15,
        fontWeight: '600',
        fontFamily: typography.serif,
    },
    userTextCol: {
        justifyContent: 'center',
    },
    rolePill: {
        alignSelf: 'flex-start',
        backgroundColor: '#F3ECE1',
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 6,
        paddingVertical: 1,
        borderRadius: 3,
        marginBottom: 2,
    },
    rolePillText: {
        color: colors.bronze,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
    },
    userName: {
        color: colors.atelierBlack,
        fontSize: 13,
        fontWeight: '600',
        maxWidth: 180,
    },
    userEmail: {
        color: colors.textSecondary,
        fontSize: 11,
        maxWidth: 180,
    },
    signOutButton: {
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: colors.surfaceSubtle,
    },
    signOutButtonText: {
        color: colors.textPrimary,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.4,
    },

    // Contenedor principal de scroll
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 28,
        paddingBottom: 60,
        maxWidth: 1280,
        width: '100%',
        alignSelf: 'center',
    },

    // 2. Hero Principal Asimétrico
    heroCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
        marginBottom: 40,
        shadowColor: colors.atelierBlack,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
    },
    heroLayout: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    heroLayoutMobile: {
        flexDirection: 'column-reverse',
    },
    heroTextCol: {
        flex: 1.2,
        padding: 40,
        justifyContent: 'center',
    },
    heroTextColMobile: {
        padding: 24,
    },
    heroPrebadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#F8F2E9',
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    heroPrebadgeStar: {
        color: colors.champagneGold,
        fontSize: 10,
    },
    heroPrebadgeText: {
        color: colors.bronze,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.6,
    },
    heroHeadline: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 34,
        fontWeight: '500',
        lineHeight: 42,
        marginBottom: 16,
    },
    heroHeadlineMobile: {
        fontSize: 27,
        lineHeight: 34,
    },
    heroSubtitle: {
        color: colors.textSecondary,
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 20,
        maxWidth: 540,
    },
    heroDividerLine: {
        height: 1,
        backgroundColor: colors.sand,
        marginBottom: 18,
    },
    heroGreetingRow: {
        marginBottom: 14,
    },
    heroGreetingLabel: {
        color: colors.champagneGold,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.5,
        marginBottom: 2,
    },
    heroGreetingName: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 19,
        fontWeight: '600',
    },
    sessionStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingTop: 12,
    },
    greenPulseDot: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: colors.success,
    },
    sessionStatusText: {
        color: colors.textMuted,
        fontSize: 12,
        letterSpacing: 0.2,
    },
    heroImageCol: {
        flex: 1.05,
        minHeight: 340,
        backgroundColor: colors.surfaceSubtle,
    },
    heroImageColMobile: {
        minHeight: 220,
    },
    imageFrame: {
        flex: 1,
        position: 'relative',
        overflow: 'hidden',
    },
    heroImage: {
        width: '100%',
        height: '100%',
        minHeight: 320,
    },
    imageOverlayGradient: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 20,
        backgroundColor: 'rgba(23, 20, 17, 0.78)',
    },
    imageOverlayTopBar: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    imageCaptionBrand: {
        color: colors.champagneGold,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 2,
    },
    imageCaptionDot: {
        color: colors.champagneGold,
        fontSize: 9,
    },
    imageCaptionAuthor: {
        color: '#FAF7F2',
        fontFamily: typography.serif,
        fontSize: 14,
        fontWeight: '500',
    },
    imageCaptionSub: {
        color: '#D8CCBA',
        fontSize: 11,
        marginTop: 2,
        fontStyle: 'italic',
    },

    // 3. Cabecera de Sección
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 26,
        gap: 16,
    },
    sectionHeaderLine: {
        flex: 1,
        height: 1,
        backgroundColor: colors.sand,
    },
    sectionHeaderTitleBox: {
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    sectionEyebrow: {
        color: colors.champagneGold,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
        marginBottom: 4,
    },
    sectionTitle: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 27,
        fontWeight: '600',
        letterSpacing: 1,
    },
    sectionSubtitle: {
        color: colors.textSecondary,
        fontSize: 13,
        textAlign: 'center',
        maxWidth: 640,
        marginTop: 6,
        lineHeight: 18,
    },

    // Layout de Columnas Responsivas
    colFourth: {
        flex: 1,
        minWidth: 260,
    },
    colThird: {
        flex: 1,
        minWidth: 280,
    },
    colHalf: {
        flex: 1,
        minWidth: 320,
    },
    colFull: {
        width: '100%',
        minWidth: '100%',
    },

    // Grid "¿Qué quieres hacer hoy?"
    workGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        marginBottom: 44,
        width: '100%',
    },
    experienceCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
        justifyContent: 'space-between',
        boxSizing: 'border-box' as any,
        shadowColor: colors.atelierBlack,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    experienceCardFeatured: {
        borderWidth: 2,
        borderColor: colors.champagneGold,
        backgroundColor: '#FFFDF9',
        shadowColor: colors.champagneGold,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 14,
        elevation: 4,
    },
    experienceImageWrapper: {
        width: '100%',
        height: 154,
        position: 'relative',
        backgroundColor: colors.surfaceSubtle,
        overflow: 'hidden',
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    experienceImage: {
        width: '100%',
        height: '100%',
    },
    experienceImageDimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(23, 20, 17, 0.12)',
    },
    experienceTag: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(23, 20, 17, 0.8)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 3,
        borderWidth: 1,
        borderColor: 'rgba(230, 217, 200, 0.4)',
    },
    experienceTagText: {
        color: '#FAF7F2',
        fontSize: 8.5,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    experienceTagGold: {
        backgroundColor: 'rgba(23, 20, 17, 0.95)',
        borderColor: colors.champagneGold,
    },
    experienceTagGoldText: {
        color: colors.champagneGold,
        fontSize: 8.5,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    experienceBody: {
        padding: 22,
        flex: 1,
        justifyContent: 'space-between',
    },
    experienceTextTop: {
        width: '100%',
    },
    cardWatermarkRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 2,
    },
    cardWatermarkText: {
        fontFamily: typography.serif,
        fontSize: 18,
        fontWeight: '600',
        color: colors.sand,
    },
    cardWatermarkGold: {
        fontFamily: typography.serif,
        fontSize: 18,
        fontWeight: '700',
        color: colors.champagneGold,
    },
    experienceTitle: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 20,
        fontWeight: '600',
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    experienceTitleGold: {
        color: colors.atelierBlack,
    },
    experienceTagline: {
        color: colors.bronze,
        fontFamily: typography.serif,
        fontStyle: 'italic',
        fontSize: 13.5,
        lineHeight: 19,
        marginBottom: 8,
    },
    experienceTaglineGold: {
        color: colors.champagneGold,
        fontFamily: typography.serif,
        fontStyle: 'italic',
        fontSize: 13.5,
        lineHeight: 19,
        marginBottom: 8,
    },
    experienceSummary: {
        color: colors.textSecondary,
        fontSize: 12,
        lineHeight: 17,
        marginBottom: 18,
    },
    experienceButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.surfaceSubtle,
        borderWidth: 1,
        borderColor: colors.sand,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 4,
        marginTop: 'auto',
    },
    experienceButtonText: {
        color: colors.atelierBlack,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    experienceButtonArrow: {
        color: colors.atelierBlack,
        fontSize: 14,
        fontWeight: '700',
    },
    experienceButtonFeatured: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.atelierBlack,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 4,
        marginTop: 'auto',
    },
    experienceButtonFeaturedText: {
        color: '#FAF7F2',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    experienceButtonFeaturedArrow: {
        color: colors.champagneGold,
        fontSize: 14,
        fontWeight: '700',
    },

    // 4. Mesa de Trabajo: Continuar en el Atelier
    workbenchWrap: {
        marginBottom: 44,
    },
    workbenchCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: colors.champagneGold,
        overflow: 'hidden',
        shadowColor: colors.atelierBlack,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.05,
        shadowRadius: 14,
        elevation: 2,
    },
    workbenchLayout: {
        flexDirection: 'row',
        alignItems: 'stretch',
    },
    workbenchLayoutMobile: {
        flexDirection: 'column',
    },
    workbenchImageCol: {
        flex: 0.9,
        minHeight: 280,
        backgroundColor: colors.surfaceSubtle,
        position: 'relative',
        overflow: 'hidden',
        borderRightWidth: 1,
        borderRightColor: colors.sand,
    },
    workbenchImageColMobile: {
        minHeight: 220,
        borderRightWidth: 0,
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    workbenchImage: {
        width: '100%',
        height: '100%',
        minHeight: 280,
    },
    workbenchImageBadge: {
        position: 'absolute',
        top: 14,
        left: 14,
        backgroundColor: 'rgba(23, 20, 17, 0.85)',
        borderWidth: 1,
        borderColor: colors.champagneGold,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 4,
    },
    workbenchImageBadgeText: {
        color: colors.champagneGold,
        fontSize: 9.5,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    workbenchContentCol: {
        flex: 1.2,
        padding: 32,
        justifyContent: 'space-between',
    },
    workbenchContentColMobile: {
        padding: 22,
    },
    workbenchTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    workbenchPill: {
        backgroundColor: '#F8F2E9',
        borderWidth: 1,
        borderColor: colors.sand,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    workbenchPillText: {
        color: colors.bronze,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    workbenchWatermark: {
        fontFamily: typography.serif,
        fontSize: 18,
        fontWeight: '600',
        color: colors.champagneGold,
    },
    workbenchPieceTitle: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 24,
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    workbenchPieceSubtitle: {
        color: colors.bronze,
        fontFamily: typography.serif,
        fontStyle: 'italic',
        fontSize: 14,
        marginBottom: 18,
    },
    workbenchGridDetails: {
        backgroundColor: '#FAF7F2',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 16,
        gap: 12,
        marginBottom: 22,
    },
    workbenchDetailItem: {
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(230, 217, 200, 0.6)',
        paddingBottom: 8,
    },
    workbenchDetailItemFull: {
        paddingTop: 2,
    },
    workbenchDetailLabel: {
        color: colors.champagneGold,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1.2,
        marginBottom: 2,
    },
    workbenchDetailValue: {
        color: colors.atelierBlack,
        fontSize: 13,
        fontWeight: '600',
        marginBottom: 1,
    },
    workbenchDetailSub: {
        color: colors.textSecondary,
        fontSize: 11,
        fontStyle: 'italic',
    },
    workbenchActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    workbenchPrimaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: colors.atelierBlack,
        paddingVertical: 13,
        paddingHorizontal: 22,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.atelierBlack,
    },
    workbenchPrimaryButtonText: {
        color: '#FAF7F2',
        fontSize: 12.5,
        fontWeight: '700',
        letterSpacing: 1.2,
    },
    workbenchPrimaryButtonArrow: {
        color: colors.champagneGold,
        fontSize: 15,
        fontWeight: '700',
    },
    workbenchSecondaryButton: {
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.surfaceSubtle,
    },
    workbenchSecondaryButtonText: {
        color: colors.atelierBlack,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 0.4,
    },

    // 5. Franja Editorial: Manifiesto de Marca
    manifestoBand: {
        backgroundColor: colors.atelierBlack,
        borderRadius: 8,
        paddingVertical: 44,
        paddingHorizontal: 32,
        marginBottom: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.champagneGold,
    },
    manifestoInner: {
        alignItems: 'center',
        maxWidth: 680,
    },
    manifestoIconRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    manifestoGoldStar: {
        color: colors.champagneGold,
        fontSize: 12,
    },
    manifestoLineOne: {
        color: '#FAF7F2',
        fontFamily: typography.serif,
        fontSize: 22,
        fontWeight: '500',
        letterSpacing: 1,
        textAlign: 'center',
        lineHeight: 30,
    },
    manifestoLineTwo: {
        color: colors.champagneGold,
        fontFamily: typography.serif,
        fontSize: 24,
        fontWeight: '600',
        fontStyle: 'italic',
        letterSpacing: 1.2,
        textAlign: 'center',
        lineHeight: 34,
        marginVertical: 4,
    },
    manifestoLineThree: {
        color: '#FAF7F2',
        fontFamily: typography.serif,
        fontSize: 22,
        fontWeight: '500',
        letterSpacing: 1,
        textAlign: 'center',
        lineHeight: 30,
    },
    manifestoSignatureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        marginTop: 22,
        width: '100%',
        justifyContent: 'center',
    },
    manifestoRule: {
        width: 40,
        height: 1,
        backgroundColor: colors.champagneGold,
    },
    manifestoAuthor: {
        color: colors.champagneGold,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 2,
    },

    // 6. Acciones Secundarias & Próximas Fases (Tratamiento Ligero / Subordinado)
    subordinatedSectionWrap: {
        marginBottom: 40,
    },
    subordinatedHeader: {
        marginBottom: 20,
    },
    subordinatedEyebrow: {
        color: colors.textMuted,
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1.8,
        marginBottom: 2,
    },
    subordinatedTitle: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 20,
        fontWeight: '600',
    },
    subordinatedSubtitle: {
        color: colors.textSecondary,
        fontSize: 12.5,
        marginTop: 3,
    },
    secondaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
        width: '100%',
    },
    subordinatedCard: {
        backgroundColor: colors.surface,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
        justifyContent: 'space-between',
        boxSizing: 'border-box' as any,
    },
    subordinatedCardDashed: {
        backgroundColor: 'rgba(255, 255, 255, 0.65)',
        borderStyle: 'dashed',
    },
    subordinatedImageWrapper: {
        width: '100%',
        height: 114,
        position: 'relative',
        backgroundColor: colors.surfaceSubtle,
        overflow: 'hidden',
        borderBottomWidth: 1,
        borderBottomColor: colors.sand,
    },
    subordinatedImage: {
        width: '100%',
        height: '100%',
    },
    subordinatedBody: {
        padding: 16,
        flex: 1,
        justifyContent: 'space-between',
    },
    subordinatedCardTitle: {
        color: colors.atelierBlack,
        fontFamily: typography.serif,
        fontSize: 15.5,
        fontWeight: '600',
        marginBottom: 6,
    },
    subordinatedCardText: {
        color: colors.textSecondary,
        fontSize: 11.5,
        lineHeight: 16,
        marginBottom: 12,
    },
    securityCheckBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 7,
        paddingHorizontal: 10,
        backgroundColor: colors.successBg,
        borderWidth: 1,
        borderColor: colors.successBorder,
        borderRadius: 4,
        marginTop: 'auto',
    },
    securityCheckIcon: {
        color: colors.success,
        fontSize: 11,
        fontWeight: '700',
    },
    securityCheckText: {
        color: colors.success,
        fontSize: 10,
        fontWeight: '600',
    },
    upcomingBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 'auto',
    },
    upcomingDot: {
        color: colors.champagneGold,
        fontSize: 11,
    },
    upcomingText: {
        color: colors.textMuted,
        fontSize: 10.5,
        fontStyle: 'italic',
    },

    // 7. Pie de Página Sobrio
    footerContainer: {
        marginTop: 10,
        paddingTop: 24,
        paddingBottom: 20,
        alignItems: 'center',
    },
    footerLine: {
        width: 60,
        height: 1,
        backgroundColor: colors.champagneGold,
        marginBottom: 18,
    },
    footerContent: {
        alignItems: 'center',
        gap: 4,
    },
    footerStar: {
        color: colors.champagneGold,
        fontSize: 12,
        marginBottom: 2,
    },
    footerBrand: {
        color: colors.atelierBlack,
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 3,
    },
    footerAuthor: {
        color: colors.champagneGold,
        fontFamily: typography.serif,
        fontSize: 13,
        letterSpacing: 0.8,
    },
    footerTagline: {
        color: colors.textMuted,
        fontSize: 11,
        marginTop: 4,
        textAlign: 'center',
    },
});
