// ==============================================================================
// ATELIER DIGITAL — SUBCOMPONENTE MODULAR: HUB PRINCIPAL Y VÍAS EDITORIALES
// Archivo: src/components/pattern/PatternStudioHub.tsx
// ==============================================================================

import React from 'react';
import {
    Image,
    Platform,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { router } from 'expo-router';
import { styles } from './patternModuleStyles';

const PATTERN_HERO_IMAGE = require('../../../assets/service_couture.jpg');
const PATTERN_CLIENTS_IMAGE = require('../../../assets/patterns/pattern_clients.jpg');
const PATTERN_DIRECT_IMAGE = require('../../../assets/patterns/pattern_direct.jpg');
const PATTERN_CREATIONS_IMAGE = require('../../../assets/patterns/pattern_creations.jpg');
const PATTERN_ARCHIVE_IMAGE = require('../../../assets/patterns/pattern_archive.jpg');
const PATTERN_FREE_IMAGE = require('../../../assets/patterns/pattern_free.jpg');

export interface PatternStudioHubProps {
    onNavigateMeasurements: () => void;
    onNavigateDirectPattern: () => void;
    onNavigateCreationPattern: () => void;
    onNavigateFreePattern: () => void;
}

export const PatternStudioHub: React.FC<PatternStudioHubProps> = ({
    onNavigateMeasurements,
    onNavigateDirectPattern,
    onNavigateCreationPattern,
    onNavigateFreePattern,
}) => {
    const { width: windowWidth } = useWindowDimensions();
    const isMobile = windowWidth < 720;
    const isTablet = windowWidth >= 720 && windowWidth < 1120;
    const isDesktop = windowWidth >= 1120;

    // Grids responsivos de alta costura para el Hub de Patronaje (M02)
    // 1. Tres vías principales ordenadas: 01 Mis Clientas, 02 Patronaje Directo, 03 Patrones de Creaciones
    const protagonistCardsGridStyle = [
        styles.hubCardsGridProtagonists,
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

    // 2. Dos alternativas de archivo y experimentación: 04 Banco de Patrones y 05 Patrón Libre
    const secondaryCardsGridStyle = [
        styles.hubCardsGridSecondary,
        Platform.OS === 'web' && {
            display: 'grid',
            gridTemplateColumns: isDesktop || isTablet
                ? 'repeat(2, minmax(0, 1fr))'
                : '1fr',
            gap: 20,
            alignItems: 'stretch',
        } as any,
    ];

    // 3. Archivo Técnico del Atelier (Directorio de Clientas y Banco Global)
    const archiveCatalogGridStyle = [
        styles.hubSecondaryButtonsRow,
        Platform.OS === 'web' && {
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))',
            gap: 16,
        } as any,
    ];

    return (
                    <View style={styles.hubContainer}>
                        {/* HERO EDITORIAL ASIMÉTRICO DE ALTA COSTURA */}
                        <View style={[styles.hubHeroCard, isMobile && styles.hubHeroCardMobile]}>
                            <View style={styles.hubHeroContent}>
                                <View style={styles.hubHeroEyebrowRow}>
                                    <Text style={styles.hubHeroStar}>✦</Text>
                                    <Text style={styles.hubHeroEyebrow}>ATELIER DIGITAL · BY KATHERINE CARROLL</Text>
                                    <View style={styles.hubHeroTag}>
                                        <Text style={styles.hubHeroTagText}>MÓDULO 02 · ALTA COSTURA</Text>
                                    </View>
                                </View>
                                <Text style={styles.hubHeroTitle}>Del cuerpo al patrón.</Text>
                                <Text style={styles.hubHeroSubtitle}>
                                    Precisión anatómica, geometría paramétrica y trazabilidad técnica.
                                </Text>
                                <Text style={styles.hubHeroDescription}>
                                    Estudio técnico de patronaje digital y corte a medida. Formulación matemática de aplomos, holguras y curvas de contorno para transformar medidas corporales en patrones de alta costura con precisión milimétrica.
                                </Text>

                                <View style={styles.hubHeroBadgesRow}>
                                    <View style={styles.hubHeroPill}>
                                        <Text style={styles.hubHeroPillDot}>•</Text>
                                        <Text style={styles.hubHeroPillText}>Tolerancia milimétrica ±0.5 mm</Text>
                                    </View>
                                    <View style={styles.hubHeroPill}>
                                        <Text style={styles.hubHeroPillDot}>•</Text>
                                        <Text style={styles.hubHeroPillText}>Graduación y aplomos anatómicos</Text>
                                    </View>
                                    <View style={styles.hubHeroPill}>
                                        <Text style={styles.hubHeroPillDot}>•</Text>
                                        <Text style={styles.hubHeroPillText}>Exportación vectorial DXF / SVG / PDF</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.hubHeroImageWrapper, isMobile && styles.hubHeroImageWrapperMobile]}>
                                <Image
                                    source={PATTERN_HERO_IMAGE}
                                    style={styles.hubHeroImage}
                                    resizeMode="cover"
                                />
                                <View style={styles.hubHeroImageOverlay} />
                                <View style={styles.hubHeroImageCaption}>
                                    <Text style={styles.hubHeroImageCaptionEyebrow}>MESA DE CORTE & MODELADO CAD</Text>
                                    <Text style={styles.hubHeroImageCaptionTitle}>Estudio de Patronaje de Alta Costura</Text>
                                </View>
                            </View>
                        </View>

                        {/* SECCIÓN "EXPERIENCIAS DE PATRONAJE" */}
                        <View style={styles.hubSectionHeader}>
                            <View style={styles.hubSectionHeaderLine} />
                            <View style={styles.hubSectionHeaderContent}>
                                <Text style={styles.hubSectionEyebrow}>ESTUDIO TÉCNICO DE PATRONAJE</Text>
                                <Text style={styles.hubSectionTitle}>Experiencias de Patronaje</Text>
                                <Text style={styles.hubSectionSubtitle}>
                                    Selecciona la vía de trabajo para modelar y certificar patrones de alta costura:
                                </Text>
                            </View>
                            <View style={styles.hubSectionHeaderLine} />
                        </View>

                        {/* ============================================================================== */}
                        {/* 1. VÍAS PRINCIPALES: 01 CLIENTAS, 02 DIRECTO, 03 CREACIONES                   */}
                        {/* ============================================================================== */}
                        <View style={protagonistCardsGridStyle}>
                            {/* 01 · MIS CLIENTAS */}
                            <TouchableOpacity
                                style={styles.hubCoProtagonistCard}
                                onPress={onNavigateMeasurements}
                                activeOpacity={0.88}
                            >
                                <View style={styles.hubCardImageWrapperProtagonist}>
                                    <Image
                                        source={PATTERN_CLIENTS_IMAGE}
                                        style={styles.hubCardImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.hubCardImageOverlay} />
                                    <View style={styles.hubCardBadgeFloating}>
                                        <Text style={styles.hubCardBadgeFloatingText}>01 · MEDIDAS & ANATOMÍA</Text>
                                    </View>
                                </View>

                                <View style={styles.hubCoProtagonistCardBody}>
                                    <View style={styles.hubProtagonistEyebrowRow}>
                                        <Text style={styles.hubPrimaryCardEyebrow}>01 · MIS CLIENTAS</Text>
                                        <View style={styles.hubCoutureTag}>
                                            <Text style={styles.hubCoutureTagText}>MEDIDAS</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.hubCoProtagonistCardTitle}>Mis Clientas</Text>
                                    <Text style={styles.hubCoProtagonistCardSub}>
                                        Gestiona medidas y sesiones corporales.
                                    </Text>
                                    <Text style={styles.hubCoProtagonistCardDesc}>
                                        Consulta, registra y rectifica las cotas anatómicas corporales de tus clientas para alimentar el motor paramétrico.
                                    </Text>

                                    {/* Flujo conceptual de taller: CLIENTAS → ANATOMÍA → SESIONES → COTAS */}
                                    <View style={styles.hubConceptFlow}>
                                        <Text style={styles.hubConceptFlowLabel}>FLUJO DE REGISTRO:</Text>
                                        <View style={styles.hubConceptPipeline}>
                                            <View style={styles.hubConceptPillActive}><Text style={styles.hubConceptPillTextActive}>CLIENTAS</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>ANATOMÍA</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>SESIONES</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>COTAS</Text></View>
                                        </View>
                                    </View>

                                    <View style={styles.hubCoProtagonistCardFooter}>
                                        <View style={styles.hubStepSummary}>
                                            <Text style={styles.hubStepSummaryText}>Directorio · Medición · Rectificación</Text>
                                        </View>
                                        <View style={styles.hubCoProtagonistActionBtn}>
                                            <Text style={styles.hubCoProtagonistActionBtnText}>ENTRAR AL REGISTRO →</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* 02 · PATRONAJE DIRECTO (PROTAGONISTA SUPREMO) */}
                            <TouchableOpacity
                                style={styles.hubProtagonistCard}
                                onPress={onNavigateDirectPattern}
                                activeOpacity={0.88}
                            >
                                <View style={styles.hubCardImageWrapperProtagonist}>
                                    <Image
                                        source={PATTERN_DIRECT_IMAGE}
                                        style={styles.hubCardImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.hubProtagonistImageOverlay} />
                                    <View style={styles.hubProtagonistBadgeFloating}>
                                        <Text style={styles.hubProtagonistBadgeFloatingText}>★ EXPERIENCIA PROTAGONISTA · ALTA COSTURA</Text>
                                    </View>
                                </View>

                                <View style={styles.hubProtagonistCardBody}>
                                    <View style={styles.hubProtagonistEyebrowRow}>
                                        <Text style={styles.hubProtagonistEyebrow}>02 · PATRONAJE DIRECTO</Text>
                                        <View style={styles.hubCoutureTag}>
                                            <Text style={styles.hubCoutureTagText}>DIRECTO A CAD</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.hubProtagonistCardTitle}>Patronaje Directo</Text>
                                    <Text style={styles.hubProtagonistCardSub}>
                                        Crea un patrón desde una clienta, sus medidas y una prenda.
                                    </Text>
                                    <Text style={styles.hubProtagonistCardDesc}>
                                        Transforma de inmediato las medidas tomadas en el maniquí o clienta en un patrón técnico calibrado, sin requerir una ficha previa de Creación.
                                    </Text>

                                    {/* Flujo conceptual de taller: MEDIDAS → PRENDA → PATRONAJE → CAD → PRODUCCIÓN */}
                                    <View style={styles.hubConceptFlow}>
                                        <Text style={styles.hubConceptFlowLabel}>FLUJO DE EJECUCIÓN:</Text>
                                        <View style={styles.hubConceptPipeline}>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>MEDIDAS</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>PRENDA</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPillActive}><Text style={styles.hubConceptPillTextActive}>PATRONAJE</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>CAD</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>PRODUCCIÓN</Text></View>
                                        </View>
                                    </View>

                                    <View style={styles.hubProtagonistCardFooter}>
                                        <View style={styles.hubStepSummary}>
                                            <Text style={styles.hubStepSummaryHighlight}>Clienta → Sesión → Prenda → CAD</Text>
                                        </View>
                                        <View style={styles.hubProtagonistActionBtn}>
                                            <Text style={styles.hubProtagonistActionBtnText}>ABRIR MOTOR DE PATRONAJE →</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* 03 · PATRONES DE CREACIONES (CO-PROTAGONISTA) */}
                            <TouchableOpacity
                                style={styles.hubCoProtagonistCard}
                                onPress={onNavigateCreationPattern}
                                activeOpacity={0.88}
                            >
                                <View style={styles.hubCardImageWrapperProtagonist}>
                                    <Image
                                        source={PATTERN_CREATIONS_IMAGE}
                                        style={styles.hubCardImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.hubCardImageOverlay} />
                                    <View style={styles.hubCardBadgeFloating}>
                                        <Text style={styles.hubCardBadgeFloatingText}>03 · COLECCIÓN & FITTINGS</Text>
                                    </View>
                                </View>

                                <View style={styles.hubCoProtagonistCardBody}>
                                    <View style={styles.hubProtagonistEyebrowRow}>
                                        <Text style={styles.hubPrimaryCardEyebrow}>03 · PATRONES DE CREACIONES</Text>
                                        <View style={styles.hubCoutureTag}>
                                            <Text style={styles.hubCoutureTagText}>VINCULADO</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.hubCoProtagonistCardTitle}>Patrones de Creaciones</Text>
                                    <Text style={styles.hubCoProtagonistCardSub}>
                                        Construye y administra patrones vinculados a Creaciones.
                                    </Text>
                                    <Text style={styles.hubCoProtagonistCardDesc}>
                                        Desarrolla patrones vinculados a fichas de Creación de Alta Costura con trazabilidad de versiones, bitácora de fittings y dossier técnico de taller.
                                    </Text>

                                    {/* Flujo conceptual de Creación */}
                                    <View style={styles.hubConceptFlow}>
                                        <Text style={styles.hubConceptFlowLabel}>FLUJO DE CREACIÓN:</Text>
                                        <View style={styles.hubConceptPipeline}>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>CLIENTA</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>CREACIÓN</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPillActive}><Text style={styles.hubConceptPillTextActive}>FITTINGS</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>CAD</Text></View>
                                            <Text style={styles.hubConceptArrow}>→</Text>
                                            <View style={styles.hubConceptPill}><Text style={styles.hubConceptPillText}>DOSSIER</Text></View>
                                        </View>
                                    </View>

                                    <View style={styles.hubCoProtagonistCardFooter}>
                                        <View style={styles.hubStepSummary}>
                                            <Text style={styles.hubStepSummaryText}>Clienta → Creación → Sesión → CAD</Text>
                                        </View>
                                        <View style={styles.hubCoProtagonistActionBtn}>
                                            <Text style={styles.hubCoProtagonistActionBtnText}>CONSTRUIR PATRÓN DE CREACIÓN →</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* ============================================================================== */}
                        {/* 2. ARCHIVO CENTRAL & EXPERIMENTACIÓN (04 · BANCO, 05 · PATRÓN LIBRE)           */}
                        {/* ============================================================================== */}
                        <View style={styles.hubSecondaryHeaderRow}>
                            <View style={styles.hubSecondaryDivider} />
                            <Text style={styles.hubSecondarySectionTitle}>ARCHIVO CENTRAL & EXPERIMENTACIÓN CAD</Text>
                            <View style={styles.hubSecondaryDivider} />
                        </View>

                        <View style={secondaryCardsGridStyle}>

                            {/* 04 · BANCO DE PATRONES */}
                            <TouchableOpacity
                                style={styles.hubSecondaryCard}
                                onPress={() => router.push('/(designer)/pattern-bank')}
                                activeOpacity={0.88}
                            >
                                <View style={styles.hubSecondaryCardImageWrapper}>
                                    <Image
                                        source={PATTERN_ARCHIVE_IMAGE}
                                        style={styles.hubSecondaryCardImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.hubCardImageOverlay} />
                                    <View style={styles.hubCardBadgeFloating}>
                                        <Text style={styles.hubCardBadgeFloatingText}>04 · ARCHIVO CENTRAL CAD</Text>
                                    </View>
                                </View>

                                <View style={styles.hubSecondaryCardBody}>
                                    <Text style={styles.hubSecondaryCardEyebrow}>04 · BANCO DE PATRONES</Text>
                                    <Text style={styles.hubSecondaryCardTitle}>Banco de Patrones</Text>
                                    <Text style={styles.hubSecondaryCardSub}>
                                        Tu biblioteca técnica de patrones, versiones y trazabilidad.
                                    </Text>
                                    <Text style={styles.hubSecondaryCardDesc}>
                                        Historial centralizado y linaje técnico de todas las ejecuciones (Creaciones, Directos y Libres) con trazabilidad inmutable.
                                    </Text>
                                    <View style={styles.hubSecondaryCardFooter}>
                                        <Text style={styles.hubStepSummaryText}>Creaciones · Directos · Libres</Text>
                                        <View style={styles.hubCardSecondaryActionBtn}>
                                            <Text style={styles.hubCardSecondaryActionBtnText}>Abrir Banco →</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* 05 · PATRÓN LIBRE */}
                            <TouchableOpacity
                                style={styles.hubSecondaryCard}
                                onPress={onNavigateFreePattern}
                                activeOpacity={0.88}
                            >
                                <View style={styles.hubSecondaryCardImageWrapper}>
                                    <Image
                                        source={PATTERN_FREE_IMAGE}
                                        style={styles.hubSecondaryCardImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.hubCardImageOverlay} />
                                    <View style={styles.hubCardBadgeFloating}>
                                        <Text style={styles.hubCardBadgeFloatingText}>05 · EXPERIMENTACIÓN LIBRE</Text>
                                    </View>
                                </View>

                                <View style={styles.hubSecondaryCardBody}>
                                    <Text style={styles.hubSecondaryCardEyebrow}>05 · 🧪 PATRÓN LIBRE</Text>
                                    <Text style={styles.hubSecondaryCardTitle}>Patrón Libre</Text>
                                    <Text style={styles.hubSecondaryCardSub}>
                                        Crea patrones sin cliente ni Creación.
                                    </Text>
                                    <Text style={styles.hubSecondaryCardDesc}>
                                        Genera moldes base, realiza pruebas técnicas y experimenta con tallas de referencia sin vincular datos de clientas.
                                    </Text>
                                    <View style={styles.hubSecondaryCardFooter}>
                                        <Text style={styles.hubStepSummaryText}>Tallas Referencia → CAD → Banco</Text>
                                        <View style={styles.hubCardSecondaryActionBtn}>
                                            <Text style={styles.hubCardSecondaryActionBtnText}>Iniciar Patrón Libre →</Text>
                                        </View>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        </View>

                        {/* ============================================================================== */}
                        {/* 3. ARCHIVO TÉCNICO DEL ATELIER (BIBLIOTECA & ARCHIVO CENTRAL)                  */}
                        {/* ============================================================================== */}
                        <View style={styles.hubSupportSection}>
                            <View style={styles.hubSupportHeader}>
                                <View style={styles.hubSupportEyebrowRow}>
                                    <Text style={styles.hubSupportStar}>✦</Text>
                                    <Text style={styles.hubSupportLabel}>ARCHIVO TÉCNICO DEL ATELIER</Text>
                                </View>
                                <Text style={styles.hubSupportMainTitle}>Biblioteca & Documentación Técnica</Text>
                                <Text style={styles.hubSupportSub}>
                                    Repositorio centralizado de expedientes corporales y linaje inmutable de patrones certificados de la Casa de Alta Costura.
                                </Text>
                            </View>

                            <View style={archiveCatalogGridStyle}>
                                <TouchableOpacity
                                    style={styles.hubSupportBtn}
                                    onPress={() => router.push('/(designer)/clients')}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.hubSupportIconBox}>
                                        <Text style={styles.hubSupportIcon}>👥</Text>
                                    </View>
                                    <View style={styles.hubSupportTextBox}>
                                        <View style={styles.hubArchivePill}>
                                            <Text style={styles.hubArchivePillText}>EXPEDIENTES CORPORALES</Text>
                                        </View>
                                        <Text style={styles.hubSupportBtnTitle}>Directorio de Clientas</Text>
                                        <Text style={styles.hubSupportBtnSub}>Fichas anatómicas, sesiones de medición e historial de pedidos</Text>
                                    </View>
                                    <Text style={styles.hubSupportBtnArrow}>→</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.hubSupportBtn}
                                    onPress={() => router.push('/(designer)/pattern-bank')}
                                    activeOpacity={0.8}
                                >
                                    <View style={styles.hubSupportIconBox}>
                                        <Text style={styles.hubSupportIcon}>📚</Text>
                                    </View>
                                    <View style={styles.hubSupportTextBox}>
                                        <View style={styles.hubArchivePill}>
                                            <Text style={styles.hubArchivePillText}>BIBLIOTECA CAD</Text>
                                        </View>
                                        <Text style={styles.hubSupportBtnTitle}>Banco Global de Patrones</Text>
                                        <Text style={styles.hubSupportBtnSub}>Linaje CAD, trazabilidad técnica y patrones aprobados para corte</Text>
                                    </View>
                                    <Text style={styles.hubSupportBtnArrow}>→</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </View>
    );
};
