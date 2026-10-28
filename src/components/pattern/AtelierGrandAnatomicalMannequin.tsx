// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: GRAN MANIQUÍ ANATÓMICO MAESTRO DE ALTA COSTURA
// Archivo: src/components/pattern/AtelierGrandAnatomicalMannequin.tsx
// ==============================================================================
// Silueta anatómica paramétrica reactiva a las medidas de la sesión de la clienta.
// Soporta arquetipos corporales (Mujer, Hombre, Niña, Niño), líder de cotas
// cercanas al contorno, filtros visuales por zona anatómica con atenuación y
// resaltado, presentación humana preferencial en centímetros y panel colapsable.
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import {
    Image,
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { MeasurementSession } from '../../types/pattern/measurement';
import {
    ANATOMICAL_COTAS_BY_CODE,
    ANATOMICAL_COTAS_MAPPING,
    AnatomicalCotaConfig,
    AnatomicalDisplayGroup,
    AnatomicalPerspective,
    BodyDemographicType,
    computeParametricProportions,
    computeScreenAnatomicalCoordinates,
    formatAnatomicalMeasure,
    isCotaCompatibleWithPerspective,
    isCotaVisibleInTorsoView,
    isLongitudinalMeasure,
    isSummaryPrimaryCota,
    resolveAntiCollisionLabelPositions,
    resolveMeasurementValueMm,
    ResolvedLabelLayout,
    ScreenAnatomicalCoordinate,
    SUMMARY_PRIMARY_COTA_CODES,
    FRONTAL_EXCLUSIVE_COTA_CODES,
    DORSAL_EXCLUSIVE_COTA_CODES,
    TORSO_EXCLUDED_COTA_CODES,
} from '../../engine/pattern/catalog/anatomicalMapping';
import { analyzeSessionMeasurements } from '../../engine/pattern/catalog/masterCatalog';
import { getMeasurementGuide } from '../../engine/pattern/catalog/measurementGuideCatalog';
import { AtelierMeasurementGuideModal } from './AtelierMeasurementGuideModal';
import { getCategoryCoutureIcon } from './AtelierCoutureIcons';

interface AtelierGrandAnatomicalMannequinProps {
    measurementsMm: Record<string, number>;
    session: MeasurementSession | null;
    clientName?: string;
    referenceProfileLabel?: string;
    associatedCreationName?: string;
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    onRectify?: () => void;
    onNewSession?: () => void;
    selectedMeasureCode?: string | null;
    onSelectMeasureCode?: (code: string | null) => void;
    viewMode?: 'full_body' | 'torso';
    onViewModeChange?: (mode: 'full_body' | 'torso') => void;
    perspective?: AnatomicalPerspective;
    onPerspectiveChange?: (persp: AnatomicalPerspective) => void;
    densityMode?: 'summary' | 'all';
    onDensityModeChange?: (density: 'summary' | 'all') => void;
    onOpenExport?: () => void;
    demographic?: BodyDemographicType;
    onDemographicChange?: (demographic: BodyDemographicType) => void;
    headerTitle?: string;
    headerSubtitle?: string;
    headerEyebrow?: string;
    badgeVersionText?: string;
}

const REAL_MANNEQUIN_IMAGES: Record<BodyDemographicType, any> = {
    woman: require('../../../assets/mannequin_woman_real.jpg'),
    man: require('../../../assets/mannequin_man_real.jpg'),
    girl: require('../../../assets/mannequin_girl_real.jpg'),
    boy: require('../../../assets/mannequin_boy_real.jpg'),
};

export function AtelierGrandAnatomicalMannequin({
    measurementsMm,
    session,
    clientName,
    referenceProfileLabel,
    associatedCreationName,
    isCollapsed = false,
    onToggleCollapse,
    onRectify,
    onNewSession,
    selectedMeasureCode,
    onSelectMeasureCode,
    viewMode: viewModeProp,
    onViewModeChange,
    perspective: perspectiveProp,
    onPerspectiveChange,
    densityMode: densityModeProp,
    onDensityModeChange,
    onOpenExport,
    demographic: demographicProp,
    onDemographicChange,
    headerTitle,
    headerSubtitle,
    headerEyebrow,
    badgeVersionText,
}: AtelierGrandAnatomicalMannequinProps) {
    const [selectedCategory, setSelectedCategory] = useState<AnatomicalDisplayGroup>('all');
    const [internalDemographic, setInternalDemographic] = useState<BodyDemographicType>('woman');
    const demographic = demographicProp !== undefined ? demographicProp : internalDemographic;
    const setDemographic = (d: BodyDemographicType) => {
        setInternalDemographic(d);
        onDemographicChange?.(d);
    };

    const [stageScale, setStageScale] = useState(1);
    const [internalViewMode, setInternalViewMode] = useState<'full_body' | 'torso'>('torso');
    const mannequinViewMode = viewModeProp !== undefined ? viewModeProp : internalViewMode;
    const setMannequinViewMode = (mode: 'full_body' | 'torso') => {
        setInternalViewMode(mode);
        onViewModeChange?.(mode);
    };

    const [internalDensityMode, setInternalDensityMode] = useState<'summary' | 'all'>('all'); // VISTA 'TODAS LAS COTAS' PREDETERMINADA
    const densityMode = densityModeProp !== undefined ? densityModeProp : internalDensityMode;
    const setDensityMode = (mode: 'summary' | 'all') => {
        setInternalDensityMode(mode);
        onDensityModeChange?.(mode);
    };

    const [internalPerspective, setInternalPerspective] = useState<AnatomicalPerspective>('front'); // VISTA FRONTAL PREDETERMINADA
    const viewPerspective = perspectiveProp !== undefined ? perspectiveProp : internalPerspective;
    const setViewPerspective = (persp: AnatomicalPerspective) => {
        setInternalPerspective(persp);
        onPerspectiveChange?.(persp);
    };

    const [inspectedCota, setInspectedCota] = useState<AnatomicalCotaConfig | null>(null);
    const [autoSwitchNotice, setAutoSwitchNotice] = useState<string | null>(null);

    // Auto-switch de perspectiva y vista según compatibilidad anatómica al seleccionar una cota
    useEffect(() => {
        if (!selectedMeasureCode) {
            setAutoSwitchNotice(null);
            return;
        }

        // 1. Auto-switch perspectiva si la cota es frontal o dorsal exclusiva
        if (FRONTAL_EXCLUSIVE_COTA_CODES.has(selectedMeasureCode) && viewPerspective === 'back') {
            setViewPerspective('front');
            setAutoSwitchNotice(`✦ Vista conmutada automáticamente a FRONTAL para visualizar "${selectedMeasureCode.replace(/_/g, ' ')}"`);
        } else if (DORSAL_EXCLUSIVE_COTA_CODES.has(selectedMeasureCode) && viewPerspective === 'front') {
            setViewPerspective('back');
            if (mannequinViewMode === 'torso') {
                setMannequinViewMode('full_body');
                setAutoSwitchNotice(`✦ Vista conmutada a CUERPO COMPLETO · POSTERIOR para visualizar "${selectedMeasureCode.replace(/_/g, ' ')}"`);
            } else {
                setAutoSwitchNotice(`✦ Vista conmutada automáticamente a POSTERIOR para visualizar "${selectedMeasureCode.replace(/_/g, ' ')}"`);
            }
        }

        // 2. Auto-switch modo de vista si la cota está excluida del torso (extremidades, largos)
        if (mannequinViewMode === 'torso' && TORSO_EXCLUDED_COTA_CODES.has(selectedMeasureCode)) {
            setMannequinViewMode('full_body');
            setAutoSwitchNotice(`✦ Vista conmutada automáticamente a CUERPO COMPLETO para visualizar "${selectedMeasureCode.replace(/_/g, ' ')}"`);
        }

        // 3. Reset de categoría si la cota no coincide con la pestaña actual
        const cotaDef = ANATOMICAL_COTAS_MAPPING.find((c) => c.code === selectedMeasureCode);
        if (cotaDef && selectedCategory !== 'all' && cotaDef.group !== selectedCategory) {
            setSelectedCategory('all');
        }
    }, [selectedMeasureCode]);

    useEffect(() => {
        if (autoSwitchNotice) {
            const timer = setTimeout(() => setAutoSwitchNotice(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [autoSwitchNotice]);

    // Formateo de fecha seguro evitando discrepancias de zona horaria UTC
    const formatSessionDate = (d?: string | null): string => {
        if (!d) return 'Fecha pendiente';
        const clean = d.includes('T') ? d.split('T')[0] : d;
        const parts = clean.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}/${parts[0]}`;
        }
        return clean;
    };

    // Análisis métrico estructurado de la sesión y del maniquí
    const sessionAnalysis = useMemo(() => {
        return analyzeSessionMeasurements(measurementsMm);
    }, [measurementsMm]);

    // Cotas compatibles con la vista actual: 15 para Torso Stockman, 24 para Cuerpo Completo
    const compatibleCotas = useMemo(() => {
        return ANATOMICAL_COTAS_MAPPING.filter((cota) => {
            if (mannequinViewMode === 'torso') {
                return isCotaVisibleInTorsoView(cota.zone, cota.code);
            }
            return true;
        });
    }, [mannequinViewMode]);

    // Base anatómica fija del maniquí desacoplada del catálogo general (24 Cotas representadas en el maniquí)
    const totalMannequinCotas = ANATOMICAL_COTAS_MAPPING.length;
    const totalCompatibleCotas = compatibleCotas.length; // 15 en torso, 24 en cuerpo completo

    const activeCompatibleCotasCount = useMemo(() => {
        return compatibleCotas.filter((cota) => {
            const v = resolveMeasurementValueMm(measurementsMm, cota.code);
            return typeof v === 'number' && Number.isFinite(v) && v > 0;
        }).length;
    }, [compatibleCotas, measurementsMm]);

    // Cálculo dinámico de proporciones paramétricas de la silueta
    const proportions = computeParametricProportions(measurementsMm, demographic);

    // Manejador de cambio de categoría: si el usuario pide ver extremidades, conmuta a cuerpo completo y comunica el cambio
    const handleSelectCategory = (catId: AnatomicalDisplayGroup) => {
        setSelectedCategory(catId);
        if ((catId === 'arms' || catId === 'lower') && mannequinViewMode === 'torso') {
            setMannequinViewMode('full_body');
            setAutoSwitchNotice('✦ Vista conmutada automáticamente a CUERPO COMPLETO para explorar extremidades y largos.');
        }
    };

    // Dimensiones y centro geométrico del escenario de alta costura
    const STAGE_WIDTH = 600;
    const STAGE_HEIGHT = 840;
    const CX = STAGE_WIDTH / 2; // 300

    // Cálculo centralizado de coordenadas en pantalla a partir del modelo normalizado
    const screenCoordinates = useMemo(() => {
        return computeScreenAnatomicalCoordinates(measurementsMm, demographic, STAGE_WIDTH, STAGE_HEIGHT);
    }, [measurementsMm, demographic]);

    const allCoordsList = useMemo(() => Object.values(screenCoordinates), [screenCoordinates]);

    // Resolución automática de etiquetas anti-colisión para lado izquierdo y derecho
    const leftResolved = useMemo(() => {
        return resolveAntiCollisionLabelPositions(allCoordsList, 'left', STAGE_WIDTH, STAGE_HEIGHT);
    }, [allCoordsList]);

    const rightResolved = useMemo(() => {
        return resolveAntiCollisionLabelPositions(allCoordsList, 'right', STAGE_WIDTH, STAGE_HEIGHT);
    }, [allCoordsList]);

    const allResolvedLabels = useMemo(() => [...leftResolved, ...rightResolved], [leftResolved, rightResolved]);

    // Filtrado de cotas visibles según la perspectiva anatómica y el modo de vista:
    // 1. En perspectiva frontal: muestra cotas frontales; excluye cotas dorsales exclusivas (largo_talle_espalda, etc.).
    // 2. En perspectiva posterior: muestra silueta de espalda y cotas dorsales; excluye cotas frontales exclusivas.
    // 3. En vista torso Stockman: fotografía frontal; excluye miembros y cotas dorsales.
    const displayedLabels = useMemo(() => {
        const effectivePerspective: AnatomicalPerspective = mannequinViewMode === 'torso' ? 'front' : viewPerspective;
        const perspectiveFiltered = allResolvedLabels.filter((item) =>
            isCotaCompatibleWithPerspective(item.code, effectivePerspective)
        );

        let filtered = perspectiveFiltered;
        if (mannequinViewMode === 'torso') {
            filtered = perspectiveFiltered.filter((item) => isCotaVisibleInTorsoView(item.zone, item.code));
        }

        // Si hay una cota seleccionada válida en este maniquí pero filtrada por la perspectiva previa,
        // garantizar que se incluya determinísticamente
        if (selectedMeasureCode && !filtered.some((f) => f.code === selectedMeasureCode)) {
            const missingSelected = allResolvedLabels.find((l) => l.code === selectedMeasureCode);
            if (missingSelected) {
                filtered = [...filtered, missingSelected];
            }
        }

        return filtered;
    }, [allResolvedLabels, mannequinViewMode, viewPerspective, selectedMeasureCode]);

    // Anchuras proporcionales reactivas para silueta y guías
    const shoulderW = (demographic === 'man' ? 86 : demographic === 'girl' ? 60 : demographic === 'boy' ? 64 : 76) * proportions.shoulderScale;
    const bustW = (demographic === 'man' ? 74 : demographic === 'girl' ? 52 : demographic === 'boy' ? 54 : 68) * proportions.bustScale;
    const ubW = bustW * 0.88;
    const waistW = (demographic === 'man' ? 58 : demographic === 'girl' ? 46 : demographic === 'boy' ? 48 : 46) * proportions.waistScale;
    const hipW = (demographic === 'man' ? 68 : demographic === 'girl' ? 56 : demographic === 'boy' ? 54 : 74) * proportions.hipScale;
    const hhW = waistW + (hipW - waistW) * 0.55;
    const tStretch = proportions.torsoStretch;

    const Y_NECK = 124;
    const Y_SHOULDER = 156;
    const Y_BUST = 252 * tStretch;
    const Y_WAIST = 364 * tStretch;
    const Y_HIP = 472 * tStretch;
    const Y_CROTCH = 508 * tStretch;
    const Y_KNEE = 612;
    const Y_ANKLE = 740;

    // Tramos dimensionales paramétricos para medidas longitudinales:
    // Define el inicio, fin, líneas de extensión y remates perpendiculares para representar distancias físicas reales
    // situadas junto al contorno o fuera de la silueta para evitar superposiciones sobre el cuerpo.
    const longitudinalSpans = useMemo(() => {
        const spans: Record<string, {
            x1: number;
            y1: number;
            x2: number;
            y2: number;
            midX: number;
            midY: number;
            cap1: { x1: number; y1: number; x2: number; y2: number };
            cap2: { x1: number; y1: number; x2: number; y2: number };
            ext1?: { x1: number; y1: number; x2: number; y2: number };
            ext2?: { x1: number; y1: number; x2: number; y2: number };
        }> = {};

        // 1. ESTATURA TOTAL: Discurre en carril dimensional lateral exterior (fuera de la silueta),
        // conectada por líneas de extensión horizontales a coronilla y plano del suelo
        const estatX = 195;
        spans['estatura_total'] = {
            x1: estatX,
            y1: 34,
            x2: estatX,
            y2: 768,
            midX: estatX,
            midY: (34 + 768) / 2,
            cap1: { x1: estatX - 6, y1: 34, x2: estatX + 6, y2: 34 },
            cap2: { x1: estatX - 6, y1: 768, x2: estatX + 6, y2: 768 },
            ext1: { x1: CX - 12, y1: 34, x2: estatX, y2: 34 },
            ext2: { x1: CX - 40, y1: 768, x2: estatX, y2: 768 },
        };

        // 2. LARGO DE HOMBRO: Unión cuello-hombro a saliente acromial
        const shStartX = CX - 18;
        const shStartY = 126;
        const shEndX = CX - shoulderW;
        const shEndY = 156;
        const shDx = shEndX - shStartX;
        const shDy = shEndY - shStartY;
        const shLen = Math.hypot(shDx, shDy) || 1;
        const shNx = -shDy / shLen;
        const shNy = shDx / shLen;
        const capLen = 5;
        spans['largo_hombro'] = {
            x1: shStartX,
            y1: shStartY,
            x2: shEndX,
            y2: shEndY,
            midX: (shStartX + shEndX) / 2,
            midY: (shStartY + shEndY) / 2,
            cap1: {
                x1: Math.round(shStartX - shNx * capLen),
                y1: Math.round(shStartY - shNy * capLen),
                x2: Math.round(shStartX + shNx * capLen),
                y2: Math.round(shStartY + shNy * capLen),
            },
            cap2: {
                x1: Math.round(shEndX - shNx * capLen),
                y1: Math.round(shEndY - shNy * capLen),
                x2: Math.round(shEndX + shNx * capLen),
                y2: Math.round(shEndY + shNy * capLen),
            },
        };

        // 3. LARGO TALLE DELANTERO: Unión cuello-hombro a nivel de cintura natural (carril anterior princesa)
        const tdelX = CX + 28;
        spans['largo_talle_delantero'] = {
            x1: tdelX,
            y1: 126,
            x2: tdelX,
            y2: Y_WAIST,
            midX: tdelX,
            midY: (126 + Y_WAIST) / 2,
            cap1: { x1: tdelX - 6, y1: 126, x2: tdelX + 6, y2: 126 },
            cap2: { x1: tdelX - 6, y1: Y_WAIST, x2: tdelX + 6, y2: Y_WAIST },
            ext1: { x1: CX + 18, y1: 126, x2: tdelX, y2: 126 },
            ext2: { x1: CX, y1: Y_WAIST, x2: tdelX, y2: Y_WAIST },
        };

        // 4. LARGO TALLE ESPALDA: 7ma cervical dorsal a nivel de cintura (carril dorsal posterior sobre columna)
        const tespX = CX;
        spans['largo_talle_espalda'] = {
            x1: tespX,
            y1: 126,
            x2: tespX,
            y2: Y_WAIST,
            midX: tespX,
            midY: (126 + Y_WAIST) / 2,
            cap1: { x1: tespX - 7, y1: 126, x2: tespX + 7, y2: 126 },
            cap2: { x1: tespX - 7, y1: Y_WAIST, x2: tespX + 7, y2: Y_WAIST },
        };

        // 5. PROFUNDIDAD SISA: 7ma cervical a horizontal sub-axilar (carril dorsal escápula)
        const sisaX = CX + 44;
        spans['profundidad_sisa'] = {
            x1: sisaX,
            y1: 126,
            x2: sisaX,
            y2: 216,
            midX: sisaX,
            midY: (126 + 216) / 2,
            cap1: { x1: sisaX - 6, y1: 126, x2: sisaX + 6, y2: 126 },
            cap2: { x1: sisaX - 6, y1: 216, x2: sisaX + 6, y2: 216 },
            ext1: { x1: CX, y1: 126, x2: sisaX, y2: 126 },
            ext2: { x1: CX + bustW * 0.94, y1: 216, x2: sisaX, y2: 216 },
        };

        // 6. ALTURA CADERA: Línea lateral junto al contorno con líneas de extensión a cintura y trocánter
        const cadX = CX - hipW - 14;
        spans['altura_cadera'] = {
            x1: cadX,
            y1: Y_WAIST,
            x2: cadX,
            y2: Y_HIP,
            midX: cadX,
            midY: (Y_WAIST + Y_HIP) / 2,
            cap1: { x1: cadX - 6, y1: Y_WAIST, x2: cadX + 6, y2: Y_WAIST },
            cap2: { x1: cadX - 6, y1: Y_HIP, x2: cadX + 6, y2: Y_HIP },
            ext1: { x1: CX - waistW, y1: Y_WAIST, x2: cadX, y2: Y_WAIST },
            ext2: { x1: CX - hipW, y1: Y_HIP, x2: cadX, y2: Y_HIP },
        };

        // 7. LARGO BRAZO: Acromion hasta muñeca sobre la extremidad superior
        const armStartX = CX + shoulderW;
        const armStartY = 156;
        const armEndX = 458;
        const armEndY = 488;
        const armDx = armEndX - armStartX;
        const armDy = armEndY - armStartY;
        const armLen = Math.hypot(armDx, armDy) || 1;
        const armNx = -armDy / armLen;
        const armNy = armDx / armLen;
        spans['largo_brazo'] = {
            x1: armStartX,
            y1: armStartY,
            x2: armEndX,
            y2: armEndY,
            midX: (armStartX + armEndX) / 2,
            midY: (armStartY + armEndY) / 2,
            cap1: {
                x1: Math.round(armStartX - armNx * capLen),
                y1: Math.round(armStartY - armNy * capLen),
                x2: Math.round(armStartX + armNx * capLen),
                y2: Math.round(armStartY + armNy * capLen),
            },
            cap2: {
                x1: Math.round(armEndX - armNx * capLen),
                y1: Math.round(armEndY - armNy * capLen),
                x2: Math.round(armEndX + armNx * capLen),
                y2: Math.round(armEndY + armNy * capLen),
            },
        };

        // 8. LARGO FALDA: Cintura natural hacia rodilla/caída inferior (carril lateral falda)
        const faldaX = 236;
        spans['largo_falda'] = {
            x1: faldaX,
            y1: Y_WAIST,
            x2: faldaX,
            y2: 648,
            midX: faldaX,
            midY: (Y_WAIST + 648) / 2,
            cap1: { x1: faldaX - 6, y1: Y_WAIST, x2: faldaX + 6, y2: Y_WAIST },
            cap2: { x1: faldaX - 6, y1: 648, x2: faldaX + 6, y2: 648 },
            ext1: { x1: CX - waistW, y1: Y_WAIST, x2: faldaX, y2: Y_WAIST },
            ext2: { x1: 249, y1: 648, x2: faldaX, y2: 648 },
        };

        // 9. LARGO PANTALÓN / EXTERIOR PIERNA: Cintura lateral a tobillo/suelo (carril lateral exterior pierna)
        const pantX = 368;
        spans['largo_pantalon'] = {
            x1: pantX,
            y1: Y_WAIST,
            x2: pantX,
            y2: 740,
            midX: pantX,
            midY: (Y_WAIST + 740) / 2,
            cap1: { x1: pantX - 6, y1: Y_WAIST, x2: pantX + 6, y2: Y_WAIST },
            cap2: { x1: pantX - 6, y1: 740, x2: pantX + 6, y2: 740 },
            ext1: { x1: CX + waistW, y1: Y_WAIST, x2: pantX, y2: Y_WAIST },
            ext2: { x1: 348, y1: 740, x2: pantX, y2: 740 },
        };
        spans['largo_exterior_pierna'] = spans['largo_pantalon'];

        // 10. ALTURA TIRO: Cintura natural a nivel de asiento/entrepierna
        const tiroX = CX + 14;
        spans['altura_tiro'] = {
            x1: tiroX,
            y1: Y_WAIST,
            x2: tiroX,
            y2: Y_CROTCH,
            midX: tiroX,
            midY: (Y_WAIST + Y_CROTCH) / 2,
            cap1: { x1: tiroX - 6, y1: Y_WAIST, x2: tiroX + 6, y2: Y_WAIST },
            cap2: { x1: tiroX - 6, y1: Y_CROTCH, x2: tiroX + 6, y2: Y_CROTCH },
            ext1: { x1: CX, y1: Y_WAIST, x2: tiroX, y2: Y_WAIST },
            ext2: { x1: CX, y1: Y_CROTCH, x2: tiroX, y2: Y_CROTCH },
        };

        return spans;
    }, [CX, shoulderW, waistW, hipW, Y_WAIST, Y_HIP, Y_CROTCH]);

    // Si está colapsado, renderizar barra condensada y elegante de alta costura
    // (Ubicado después de todos los hooks de React para garantizar consistencia inmutable en la cantidad de hooks)
    if (isCollapsed) {
        return (
            <View style={styles.collapsedBar}>
                <View style={styles.collapsedBarLeft}>
                    <View style={styles.collapsedGemPill}>
                        <Text style={styles.collapsedGemText}>
                            {session ? `v${session.version_number}` : (badgeVersionText || referenceProfileLabel || 'Libre')}
                        </Text>
                    </View>
                    <View>
                        <Text style={styles.collapsedTitle}>
                            {headerTitle ? headerTitle : (clientName ? `MANIQUÍ ANATÓMICO MAESTRO · ${clientName}` : 'PERFIL ANATÓMICO DE REFERENCIA')}
                        </Text>
                        <Text style={styles.collapsedSub}>
                            {session
                                ? `Sesión v${session.version_number} · ${formatSessionDate(session.session_date)} · ${sessionAnalysis.bodyCount}/${sessionAnalysis.totalApplicableBody} corporales · ${sessionAnalysis.bodyCompletionPct}% completitud`
                                : (headerSubtitle || referenceProfileLabel || 'Perfil anatómico de referencia')}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.toggleCollapseBtn}
                    onPress={onToggleCollapse}
                    activeOpacity={0.8}
                >
                    <Text style={styles.toggleCollapseBtnText}>⌄ Mostrar maniquí</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.outerContainer}>
            {/* ENCABEZADO EDITORIAL DE ALTA COSTURA — SIN PRENDAS EN FLUJO A */}
            <View style={styles.grandHeaderRow}>
                <View style={styles.grandHeaderLeft}>
                    {/* NIVEL 1: PERFIL ANATÓMICO DE REFERENCIA (O MANIQUÍ ANATÓMICO MAESTRO) */}
                    <View style={styles.eyebrowBadge}>
                        <Text style={styles.eyebrowText}>
                            {headerEyebrow || (session ? '✦ MANIQUÍ ANATÓMICO MAESTRO' : '✦ PERFIL ANATÓMICO DE REFERENCIA')}
                        </Text>
                    </View>
                    {/* NIVEL 2: PERFIL ACTIVO / CLIENTA / TALLA */}
                    <Text style={styles.grandTitle}>
                        {headerTitle || clientName || referenceProfileLabel || 'MUJER · M · TALLA 40'}
                    </Text>
                    {/* NIVEL 3: ESTADO / BANCO GLOBAL / FECHA / INDICADORES */}
                    <Text style={styles.grandSubtitle}>
                        {headerSubtitle || (session ? `Sesión de medidas v${session.version_number} · ${formatSessionDate(session.session_date)}` : (referenceProfileLabel ? `BANCO GLOBAL · ${referenceProfileLabel}` : 'BANCO GLOBAL · BASE DE TALLER'))}
                    </Text>
                    <View style={styles.grandIndicatorsRow}>
                        <Text style={styles.grandMeasuresCount}>
                            {mannequinViewMode === 'torso'
                                ? 'TORSO STOCKMAN · VISTA FRONTAL'
                                : `CUERPO COMPLETO · VISTA ${viewPerspective === 'front' ? 'FRONTAL' : 'POSTERIOR'}`}
                        </Text>
                        <Text style={styles.grandMeasuresSeparator}>•</Text>
                        <Text style={styles.grandCotasCount} accessibilityLabel="Cotas representadas en el maniquí">
                            {totalCompatibleCotas} cotas compatibles con esta vista ({activeCompatibleCotasCount} registradas)
                        </Text>
                    </View>
                    {associatedCreationName && (
                        <Text style={styles.associatedCreationSub}>
                            Creación vinculada: <Text style={{ color: '#D4AF37', fontWeight: '600' }}>{associatedCreationName}</Text>
                        </Text>
                    )}
                </View>

                {/* Placa de Sesión, Completitud y Botón de Ocultar Maniquí */}
                <View style={styles.headerRightCol}>
                    <View style={styles.sessionStatusCard}>
                        <View style={styles.sessionStatusTop}>
                            <Text style={styles.sessionStatusVersion}>
                                {session ? `v${session.version_number}` : (badgeVersionText || referenceProfileLabel || 'Libre')}
                            </Text>
                            <View style={[
                                styles.sessionStatusPill,
                                session?.status === 'completed' ? styles.pillCompleted : styles.pillVerified
                            ]}>
                                <Text style={styles.sessionStatusPillText}>
                                    {session?.status === 'completed'
                                        ? 'FINALIZADA'
                                        : session?.status === 'verified'
                                        ? 'VERIFICADA'
                                        : (session ? 'ACTIVA' : 'REFERENCIA')}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.sessionStatusDate}>
                            {session ? `📅 ${formatSessionDate(session?.session_date)}` : '🏛️ Banco Global · Base Taller'}
                        </Text>
                        <View style={styles.progressRow}>
                            <View style={styles.progressBarTrack}>
                                <View style={[styles.progressBarFill, { width: `${sessionAnalysis.bodyCompletionPct}%` }]} />
                            </View>
                            <Text style={styles.progressText}>{sessionAnalysis.bodyCompletionPct}%</Text>
                        </View>
                        <Text style={styles.progressCaption}>
                            {session
                                ? `Completitud de la sesión (${sessionAnalysis.bodyCount}/${sessionAnalysis.totalApplicableBody} corporales del catálogo)`
                                : `Medidas del perfil de referencia (${sessionAnalysis.bodyCount}/${sessionAnalysis.totalApplicableBody} corporales del catálogo)`}
                        </Text>
                    </View>

                    {onToggleCollapse && (
                        <TouchableOpacity
                            style={styles.collapseToggleBtn}
                            onPress={onToggleCollapse}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.collapseToggleBtnText}>⌃ Ocultar maniquí</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* BARRA CONTEXTUAL: SESIÓN UTILIZADA Y MEDIDAS ACTIVAS */}
            <View style={styles.contextBanner}>
                <View style={styles.contextBannerLeft}>
                    <Text style={styles.contextBannerLabel}>
                        {session ? 'SESIÓN UTILIZADA' : 'PERFIL ANATÓMICO DE REFERENCIA'}
                    </Text>
                    <Text style={styles.contextBannerName}>
                        {session
                            ? `v${session.version_number} · ${formatSessionDate(session.session_date)} · ${session.status === 'completed' ? 'FINALIZADA' : 'ACTIVA'}`
                            : (referenceProfileLabel ? referenceProfileLabel.toUpperCase() : 'BASE DE TALLER')}
                    </Text>
                    <Text style={styles.contextBannerSub}>
                        {sessionAnalysis.bodyCount > 0
                            ? `✓ ${sessionAnalysis.bodyCount} de ${sessionAnalysis.totalApplicableBody} medidas corporales del catálogo registradas (Busto: ${proportions.bustCm} cm · Cintura: ${proportions.waistCm} cm · Cadera: ${proportions.hipCm} cm)`
                            : 'Sin datos anatómicos suficientes'}
                    </Text>
                </View>

                {/* SELECTORES CONTEXTUALES: VISTA ANATÓMICA, MODO VISUAL, PERSPECTIVA Y ARQUETIPO CORPORAL */}
                <View style={styles.contextBannerRight}>
                    {/* SELECTOR DE VISTA DEL MANIQUÍ (CUERPO COMPLETO PARAMÉTRICO VS TORSO STOCKMAN) */}
                    <View style={styles.viewModeSelectorWrap}>
                        <Text style={styles.archetypeLabel}>VISTA ANATÓMICA:</Text>
                        <View style={styles.archetypeButtonsRow}>
                            <TouchableOpacity
                                style={[
                                    styles.archetypeBtn,
                                    mannequinViewMode === 'full_body' && styles.archetypeBtnActive,
                                ]}
                                onPress={() => setMannequinViewMode('full_body')}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.archetypeBtnText,
                                        mannequinViewMode === 'full_body' && styles.archetypeBtnTextActive,
                                    ]}
                                >
                                    ✦ CUERPO COMPLETO
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.archetypeBtn,
                                    mannequinViewMode === 'torso' && styles.archetypeBtnActive,
                                ]}
                                onPress={() => {
                                    setMannequinViewMode('torso');
                                    setViewPerspective('front');
                                    if (selectedCategory === 'arms' || selectedCategory === 'lower') {
                                        setSelectedCategory('all');
                                    }
                                }}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.archetypeBtnText,
                                        mannequinViewMode === 'torso' && styles.archetypeBtnTextActive,
                                    ]}
                                >
                                    ✦ TORSO (STOCKMAN)
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* SELECTOR DE DENSIDAD VISUAL (VISTA RESUMEN VS TODAS LAS COTAS) */}
                    <View style={styles.densitySelectorWrap}>
                        <Text style={styles.archetypeLabel}>MODO VISUAL:</Text>
                        <View style={styles.archetypeButtonsRow}>
                            <TouchableOpacity
                                style={[
                                    styles.archetypeBtn,
                                    densityMode === 'summary' && styles.archetypeBtnActive,
                                ]}
                                onPress={() => setDensityMode('summary')}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.archetypeBtnText,
                                        densityMode === 'summary' && styles.archetypeBtnTextActive,
                                    ]}
                                >
                                    ✦ RESUMEN (5)
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.archetypeBtn,
                                    densityMode === 'all' && styles.archetypeBtnActive,
                                ]}
                                onPress={() => setDensityMode('all')}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.archetypeBtnText,
                                        densityMode === 'all' && styles.archetypeBtnTextActive,
                                    ]}
                                >
                                    ✦ TODAS LAS COTAS
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* SELECTOR DE PERSPECTIVA ANATÓMICA (FRONTAL VS POSTERIOR / ESPALDA) */}
                    <View style={styles.perspectiveSelectorWrap}>
                        <Text style={styles.archetypeLabel}>PERSPECTIVA:</Text>
                        <View style={styles.archetypeButtonsRow}>
                            <TouchableOpacity
                                style={[
                                    styles.archetypeBtn,
                                    viewPerspective === 'front' && styles.archetypeBtnActive,
                                ]}
                                onPress={() => setViewPerspective('front')}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.archetypeBtnText,
                                        viewPerspective === 'front' && styles.archetypeBtnTextActive,
                                    ]}
                                >
                                    ✦ FRONTAL
                                </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.archetypeBtn,
                                    viewPerspective === 'back' && styles.archetypeBtnActive,
                                    mannequinViewMode === 'torso' && styles.archetypeBtnDisabled,
                                ]}
                                onPress={() => {
                                    if (mannequinViewMode === 'torso') {
                                        setMannequinViewMode('full_body');
                                    }
                                    setViewPerspective('back');
                                }}
                                activeOpacity={0.8}
                            >
                                <Text
                                    style={[
                                        styles.archetypeBtnText,
                                        viewPerspective === 'back' && styles.archetypeBtnTextActive,
                                    ]}
                                >
                                    ✦ POSTERIOR
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* SELECTOR DE ARQUETIPO CORPORAL (MUJER, HOMBRE, NIÑA, NIÑO) */}
                    <View style={styles.archetypeSelectorWrap}>
                        <Text style={styles.archetypeLabel}>ARQUETIPO CORPORAL:</Text>
                        <View style={styles.archetypeButtonsRow}>
                            {(
                                [
                                    { id: 'woman', label: 'MUJER' },
                                    { id: 'man', label: 'HOMBRE' },
                                    { id: 'girl', label: 'NIÑA' },
                                    { id: 'boy', label: 'NIÑO' },
                                ] as const
                            ).map((arch) => (
                                <TouchableOpacity
                                    key={arch.id}
                                    style={[
                                        styles.archetypeBtn,
                                        demographic === arch.id && styles.archetypeBtnActive,
                                    ]}
                                    onPress={() => setDemographic(arch.id)}
                                    activeOpacity={0.8}
                                >
                                    <Text
                                        style={[
                                            styles.archetypeBtnText,
                                            demographic === arch.id && styles.archetypeBtnTextActive,
                                        ]}
                                    >
                                        {arch.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>
            </View>

            {/* AVISO EDITORIAL CUANDO SE SELECCIONA LA VISTA DE TORSO DE SASTRERÍA */}
            {mannequinViewMode === 'torso' && (
                <View style={styles.torsoNoticeBanner}>
                    <Text style={styles.torsoNoticeText}>
                        ✦ <Text style={{ fontWeight: '700', color: '#E5C788' }}>VISTA ESPECIALIZADA DE TORSO (STOCKMAN):</Text> Calibrada frontalmente para las 15 cotas de cuello, hombros, tórax, busto, cintura y cadera. Las medidas de espalda y extremidades se excluyen de la fotografía y se representan en <Text style={{ fontWeight: '700', color: '#D4AF37' }}>Cuerpo Completo</Text>.
                    </Text>
                </View>
            )}

            {/* SELECTOR DE CATEGORÍAS ANATÓMICAS (FILTRO VISUAL Y RESALTADO) */}
            <View style={styles.categoryTabsRow}>
                {(
                    [
                        { id: 'all', label: densityMode === 'summary' ? 'COTAS PRINCIPALES (5)' : `TODAS LAS COTAS (${mannequinViewMode === 'full_body' ? '24' : '15'})` },
                        { id: 'bust_torso', label: 'BUSTO Y TÓRAX' },
                        { id: 'waist_hip', label: 'CINTURA Y CADERA' },
                        { id: 'back_neck', label: 'ESPALDA Y CUELLO' },
                        { id: 'arms', label: 'BRAZOS Y MANGA' },
                        { id: 'lower', label: 'INFERIOR Y LARGOS' },
                    ] as const
                ).map((cat) => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                        <TouchableOpacity
                            key={cat.id}
                            style={[styles.categoryTab, isSelected && styles.categoryTabActive]}
                            onPress={() => handleSelectCategory(cat.id)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.categoryTabInner}>
                                {getCategoryCoutureIcon(cat.id, {
                                    size: 13,
                                    color: isSelected ? '#FFFFFF' : '#A0998E',
                                })}
                                <Text style={[styles.categoryTabText, isSelected && styles.categoryTabTextActive]}>
                                    {cat.label}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* AVISO DE CONMUTACIÓN AUTOMÁTICA DE VISTA */}
            {autoSwitchNotice && (
                <View style={styles.autoSwitchBanner}>
                    <Text style={styles.autoSwitchNoticeText}>{autoSwitchNotice}</Text>
                    <TouchableOpacity onPress={() => setAutoSwitchNotice(null)} style={{ padding: 4 }}>
                        <Text style={{ color: '#E5C788', fontSize: 13, fontWeight: '700' }}>✕</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* BANNER DE COTA DESTACADA CON ACCIÓN EXPLÍCITA DE RESTAURACIÓN */}
            {selectedMeasureCode && (() => {
                const guide = getMeasurementGuide(selectedMeasureCode);
                const valMm = resolveMeasurementValueMm(measurementsMm, selectedMeasureCode);
                const fmt = formatAnatomicalMeasure(valMm, selectedMeasureCode);
                return (
                    <View style={styles.highlightedCotaBanner}>
                        <View style={styles.highlightedCotaLeft}>
                            <View style={styles.highlightedCotaBadge}>
                                <Text style={styles.highlightedCotaBadgeText}>COTA DESTACADA</Text>
                            </View>
                            <Text style={styles.highlightedCotaTitle}>{guide.visibleName}</Text>
                            <Text style={styles.highlightedCotaVal}>
                                {fmt.isRegistered ? fmt.formatted : 'No registrada'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.showAllCotasBtn}
                            onPress={() => onSelectMeasureCode?.(null)}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Mostrar todas las cotas"
                        >
                            <Text style={styles.showAllCotasBtnText}>Mostrar todas las cotas</Text>
                        </TouchableOpacity>
                    </View>
                );
            })()}

            {/* ESCENARIO DEL GRAN MANIQUÍ ANATÓMICO A ESCALA COMPLETA */}
            <View
                style={[
                    styles.stageFrame,
                    stageScale < 1 && {
                        height: Math.round(840 * stageScale),
                    },
                ]}
                onLayout={(e) => {
                    const w = e.nativeEvent.layout.width;
                    if (w > 0 && w < 600) {
                        setStageScale(w / 600);
                    } else if (w >= 600 && stageScale !== 1) {
                        setStageScale(1);
                    }
                }}
            >
                <View
                    style={[
                        styles.stageCanvas,
                        stageScale < 1 && {
                            transform: [{ scale: stageScale }],
                            transformOrigin: 'top center' as any,
                        },
                    ]}
                    pointerEvents="box-none"
                >
                    {/* CAPA B: FOTOGRAFÍA REAL DEL MANIQUÍ (SOLO EN MODO TORSO STOCKMAN) */}
                    {mannequinViewMode === 'torso' && (
                        <View style={styles.realMannequinContainer} pointerEvents="none">
                            <Image
                                source={REAL_MANNEQUIN_IMAGES[demographic] || REAL_MANNEQUIN_IMAGES.woman}
                                style={styles.realMannequinImage}
                                resizeMode="contain"
                            />
                            {/* Velo editorial sutil para asegurar contraste óptimo de cotas */}
                            <View style={styles.realMannequinOverlay} />
                        </View>
                    )}

                    {/* CAPA C.1: SVG PARAMÉTRICO DE ALTA COSTURA (COTAS, GUÍAS, ANCHORS Y LÍNEAS DIRECTRICES) */}
                    <svg
                        width="100%"
                        height="100%"
                        viewBox="0 0 600 840"
                        style={{ position: 'absolute', top: 0, left: 0, zIndex: 2, pointerEvents: 'none' }}
                    >
                        <defs>
                            <radialGradient id="highlightGlowBust" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="rgba(212, 175, 55, 0.40)" />
                                <stop offset="100%" stopColor="rgba(212, 175, 55, 0.0)" />
                            </radialGradient>
                            <radialGradient id="highlightGlowWaist" cx="50%" cy="50%" r="50%">
                                <stop offset="0%" stopColor="rgba(16, 185, 129, 0.40)" />
                                <stop offset="100%" stopColor="rgba(16, 185, 129, 0.0)" />
                            </radialGradient>
                            <linearGradient id="mannequinSilhouetteGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#1E2026" />
                                <stop offset="35%" stopColor="#252420" />
                                <stop offset="70%" stopColor="#1C1B18" />
                                <stop offset="100%" stopColor="#121316" />
                            </linearGradient>
                            <radialGradient id="mannequinBodyGlow" cx="50%" cy="40%" r="55%">
                                <stop offset="0%" stopColor="rgba(212, 175, 55, 0.16)" />
                                <stop offset="55%" stopColor="rgba(212, 175, 55, 0.04)" />
                                <stop offset="100%" stopColor="rgba(0, 0, 0, 0)" />
                            </radialGradient>
                            <linearGradient id="coutureStrokeGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#E5C788" stopOpacity="0.90" />
                                <stop offset="45%" stopColor="#D4AF37" stopOpacity="0.80" />
                                <stop offset="100%" stopColor="#997A2E" stopOpacity="0.65" />
                            </linearGradient>
                        </defs>

                        {/* MODO CUERPO COMPLETO: RENDERIZADO ANATÓMICO PARAMÉTRICO COMPLETO CON EXTREMIDADES */}
                        {mannequinViewMode === 'full_body' && (
                            <g id="parametricFullBodyMannequin">
                                {/* Resplandor dorsal de atelier */}
                                <ellipse cx={CX} cy={400} rx={180} ry={360} fill="url(#mannequinBodyGlow)" />

                                {/* Pedestal / base de sastrería de alta costura */}
                                <line x1={CX - 80} y1={770} x2={CX + 80} y2={770} stroke="#4A3C23" strokeWidth="2.5" />
                                <line x1={CX - 50} y1={775} x2={CX + 50} y2={775} stroke="#332B1A" strokeWidth="1.5" />
                                <ellipse cx={CX} cy={770} rx={40} ry={6} fill="rgba(212, 175, 55, 0.08)" stroke="#5B4823" strokeWidth="1" />

                                {viewPerspective === 'front' ? (
                                    <g id="parametricFullBodyFrontMannequin">
                                        {/* 1. CABEZA Y CUELLO */}
                                        <ellipse cx={CX} cy={34} rx={10} ry={4} fill="#8A6D3B" stroke="#D4AF37" strokeWidth="0.8" />
                                        <path d={`M ${CX - 6} 34 L ${CX - 3} 24 L ${CX + 3} 24 L ${CX + 6} 34 Z`} fill="#5C4520" stroke="#A78350" strokeWidth="0.8" />
                                        <circle cx={CX} cy={22} r={3.5} fill="#D4AF37" />

                                        <ellipse
                                            cx={CX}
                                            cy={64}
                                            rx={demographic === 'man' ? 24 : demographic === 'girl' || demographic === 'boy' ? 21 : 22}
                                            ry={demographic === 'man' ? 30 : demographic === 'girl' || demographic === 'boy' ? 26 : 28}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.4"
                                        />

                                        <path
                                            d={`M ${CX - 14} 90 Q ${CX - 16} 108 ${CX - 18} 126 L ${CX + 18} 126 Q ${CX + 16} 108 ${CX + 14} 90 Z`}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.4"
                                        />

                                        <path
                                            d={`M ${CX - 28} 126 Q ${CX} 133 ${CX + 28} 126`}
                                            fill="none"
                                            stroke="rgba(212, 175, 55, 0.45)"
                                            strokeWidth="1.2"
                                        />

                                        {/* 2. PIERNAS COMPLETAS */}
                                        {/* Pierna Izquierda: Raíz de muslo, Rodilla, Pantorrilla, Tobillo y Pie */}
                                        <path
                                            d={`
                                                M ${CX - hipW + 4} ${Y_HIP + 6}
                                                Q ${CX - hipW - 2} ${Y_HIP + 36} ${222} ${532}
                                                Q ${224} ${570} ${234} ${612}
                                                Q ${236} ${648} ${236} ${670}
                                                Q ${236} ${710} ${243} ${740}
                                                L ${238} ${768}
                                                L ${252} ${768}
                                                L ${249} ${740}
                                                Q ${256} ${710} ${258} ${670}
                                                Q ${260} ${648} ${264} ${612}
                                                Q ${262} ${570} ${262} ${532}
                                                Q ${260} ${Y_CROTCH + 12} ${CX - 3} ${Y_CROTCH}
                                                Z
                                            `}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.5"
                                        />

                                        {/* Pierna Derecha: Raíz de muslo, Rodilla, Pernera, Tobillo y Pie */}
                                        <path
                                            d={`
                                                M ${CX + 3} ${Y_CROTCH}
                                                Q ${CX + 38} ${Y_CROTCH + 12} ${338} ${532}
                                                Q ${338} ${570} ${337} ${612}
                                                Q ${338} ${648} ${338} ${670}
                                                Q ${338} ${710} ${338} ${740}
                                                L ${334} ${768}
                                                L ${348} ${768}
                                                L ${348} ${740}
                                                Q ${358} ${710} ${358} ${670}
                                                Q ${362} ${648} ${365} ${612}
                                                Q ${365} ${570} ${376} ${532}
                                                Q ${CX + hipW + 2} ${Y_HIP + 36} ${CX + hipW - 4} ${Y_HIP + 6}
                                                Z
                                            `}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.5"
                                        />

                                        {/* 3. TORSO PRINCIPAL */}
                                        <path
                                            d={`
                                                M ${CX - 18} 126
                                                Q ${CX - 40} 136 ${CX - shoulderW} 156
                                                Q ${CX - shoulderW + 6} 186 ${CX - bustW * 0.94} 216
                                                Q ${CX - bustW * 1.04} ${Y_BUST} ${CX - bustW} ${Y_BUST + 6}
                                                Q ${CX - bustW * 0.92} ${Y_BUST + 36} ${CX - ubW} ${Y_BUST + 46}
                                                Q ${CX - waistW * 1.05} ${Y_WAIST - 16} ${CX - waistW} ${Y_WAIST}
                                                Q ${CX - waistW * 0.98} ${Y_WAIST + 20} ${CX - hhW} ${Y_HIP - 40}
                                                Q ${CX - hipW * 1.04} ${Y_HIP - 10} ${CX - hipW} ${Y_HIP}
                                                Q ${CX - hipW * 0.96} ${Y_HIP + 24} ${CX - 3} ${Y_CROTCH}
                                                L ${CX + 3} ${Y_CROTCH}
                                                Q ${CX + hipW * 0.96} ${Y_HIP + 24} ${CX + hipW} ${Y_HIP}
                                                Q ${CX + hipW * 1.04} ${Y_HIP - 10} ${CX + hhW} ${Y_HIP - 40}
                                                Q ${CX + waistW * 0.98} ${Y_WAIST + 20} ${CX + waistW} ${Y_WAIST}
                                                Q ${CX + waistW * 1.05} ${Y_WAIST - 16} ${CX + ubW} ${Y_BUST + 46}
                                                Q ${CX + bustW * 0.92} ${Y_BUST + 36} ${CX + bustW} ${Y_BUST + 6}
                                                Q ${CX + bustW * 1.04} ${Y_BUST} ${CX + bustW * 0.94} 216
                                                Q ${CX + shoulderW - 6} 186 ${CX + shoulderW} 156
                                                Q ${CX + 40} 136 ${CX + 18} 126
                                                Z
                                            `}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.6"
                                        />

                                        {/* Costuras de estilo / Líneas princesa de sastrería */}
                                        <path
                                            d={`
                                                M ${CX - shoulderW * 0.55} 146
                                                Q ${CX - bustW * 0.50} ${Y_BUST - 20} ${CX - bustW * 0.42} ${Y_BUST}
                                                Q ${CX - bustW * 0.38} ${Y_BUST + 28} ${CX - waistW * 0.45} ${Y_WAIST}
                                                Q ${CX - waistW * 0.48} ${Y_WAIST + 30} ${CX - hipW * 0.45} ${Y_HIP}
                                            `}
                                            fill="none"
                                            stroke="rgba(212, 175, 55, 0.28)"
                                            strokeWidth="1"
                                            strokeDasharray="3 4"
                                        />
                                        <path
                                            d={`
                                                M ${CX + shoulderW * 0.55} 146
                                                Q ${CX + bustW * 0.50} ${Y_BUST - 20} ${CX + bustW * 0.42} ${Y_BUST}
                                                Q ${CX + bustW * 0.38} ${Y_BUST + 28} ${CX + waistW * 0.45} ${Y_WAIST}
                                                Q ${CX + waistW * 0.48} ${Y_WAIST + 30} ${CX + hipW * 0.45} ${Y_HIP}
                                            `}
                                            fill="none"
                                            stroke="rgba(212, 175, 55, 0.28)"
                                            strokeWidth="1"
                                            strokeDasharray="3 4"
                                        />

                                        {/* 4. BRAZOS COMPLETOS */}
                                        {/* Brazo Izquierdo */}
                                        <path
                                            d={`
                                                M ${CX - shoulderW} 156
                                                Q ${146} 210 ${152} 268
                                                Q ${146} 330 ${154} 384
                                                Q ${138} 440 ${142} 488
                                                L ${134} 545
                                                L ${144} 545
                                                L ${148} 488
                                                Q ${158} 440 ${162} 384
                                                Q ${174} 330 ${180} 268
                                                Q ${184} 216 ${CX - bustW * 0.94} 216
                                                Z
                                            `}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.5"
                                        />

                                        {/* Brazo Derecho */}
                                        <path
                                            d={`
                                                M ${CX + shoulderW} 156
                                                Q ${CX + bustW * 0.94} 216 ${420} 268
                                                Q ${426} 330 ${438} 384
                                                Q ${442} 440 ${452} 488
                                                L ${456} 545
                                                L ${466} 545
                                                L ${464} 488
                                                Q ${462} 440 ${454} 384
                                                Q ${454} 330 ${448} 268
                                                Q ${CX + shoulderW + 6} 210 ${CX + shoulderW} 156
                                                Z
                                            `}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.5"
                                        />

                                        {/* Relieves anatómicos frontales sobre el maniquí */}
                                        <circle cx={CX - shoulderW} cy={156} r={2.8} fill="#D4AF37" opacity={0.6} />
                                        <circle cx={CX + shoulderW} cy={156} r={2.8} fill="#D4AF37" opacity={0.6} />
                                        <circle cx={CX - bustW * 0.42} cy={Y_BUST} r={3} fill="#D4AF37" opacity={0.7} />
                                        <circle cx={CX + bustW * 0.42} cy={Y_BUST} r={3} fill="#D4AF37" opacity={0.7} />
                                        <ellipse cx={249} cy={612} rx={6} ry={7} fill="none" stroke="rgba(212, 175, 55, 0.4)" strokeWidth="0.8" />
                                        <ellipse cx={351} cy={612} rx={6} ry={7} fill="none" stroke="rgba(212, 175, 55, 0.4)" strokeWidth="0.8" />
                                    </g>
                                ) : (
                                    <g id="parametricFullBodyBackMannequin">
                                        {/* 1. CABEZA Y CUELLO POSTERIOR */}
                                        <ellipse cx={CX} cy={34} rx={10} ry={4} fill="#8A6D3B" stroke="#D4AF37" strokeWidth="0.8" />
                                        <path d={`M ${CX - 6} 34 L ${CX - 3} 24 L ${CX + 3} 24 L ${CX + 6} 34 Z`} fill="#5C4520" stroke="#A78350" strokeWidth="0.8" />
                                        <circle cx={CX} cy={22} r={3.5} fill="#D4AF37" />

                                        <ellipse
                                            cx={CX}
                                            cy={64}
                                            rx={demographic === 'man' ? 24 : demographic === 'girl' || demographic === 'boy' ? 21 : 22}
                                            ry={demographic === 'man' ? 30 : demographic === 'girl' || demographic === 'boy' ? 26 : 28}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.4"
                                        />

                                        <path
                                            d={`M ${CX - 14} 90 Q ${CX - 16} 108 ${CX - 18} 126 L ${CX + 18} 126 Q ${CX + 16} 108 ${CX + 14} 90 Z`}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.4"
                                        />

                                        {/* VÉRTEBRA C7 (PROMINENTE) EN NACIMIENTO DE CUELLO TRASERO */}
                                        <circle cx={CX} cy={126} r={3.4} fill="#D4AF37" />
                                        <circle cx={CX} cy={126} r={7} fill="none" stroke="rgba(212, 175, 55, 0.45)" strokeWidth="1" />

                                        {/* 2. PIERNAS POSTERIORES: Curva de pantorrilla, corva y tobillo */}
                                        <path
                                            d={`
                                                M ${CX - hipW + 4} ${Y_HIP + 6}
                                                Q ${CX - hipW - 2} ${Y_HIP + 36} ${222} ${532}
                                                Q ${224} ${570} ${234} ${612}
                                                Q ${236} ${648} ${236} ${670}
                                                Q ${236} ${710} ${243} ${740}
                                                L ${238} ${768}
                                                L ${252} ${768}
                                                L ${249} ${740}
                                                Q ${256} ${710} ${258} ${670}
                                                Q ${260} ${648} ${264} ${612}
                                                Q ${262} ${570} ${262} ${532}
                                                Q ${260} ${Y_CROTCH + 12} ${CX - 3} ${Y_CROTCH}
                                                Z
                                            `}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.5"
                                        />

                                        <path
                                            d={`
                                                M ${CX + 3} ${Y_CROTCH}
                                                Q ${CX + 38} ${Y_CROTCH + 12} ${338} ${532}
                                                Q ${338} ${570} ${337} ${612}
                                                Q ${338} ${648} ${338} ${670}
                                                Q ${338} ${710} ${338} ${740}
                                                L ${334} ${768}
                                                L ${348} ${768}
                                                L ${348} ${740}
                                                Q ${358} ${710} ${358} ${670}
                                                Q ${362} ${648} ${365} ${612}
                                                Q ${365} ${570} ${376} ${532}
                                                Q ${CX + hipW + 2} ${Y_HIP + 36} ${CX + hipW - 4} ${Y_HIP + 6}
                                                Z
                                            `}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.5"
                                        />

                                        {/* Pliegues posteriores de rodilla (corvas poplíteas) */}
                                        <path d={`M 234 612 Q 248 615 264 612`} fill="none" stroke="rgba(212, 175, 55, 0.40)" strokeWidth="1.2" />
                                        <path d={`M 336 612 Q 350 615 366 612`} fill="none" stroke="rgba(212, 175, 55, 0.40)" strokeWidth="1.2" />

                                        {/* 3. TORSO POSTERIOR (ESPALDA) */}
                                        <path
                                            d={`
                                                M ${CX - 18} 126
                                                Q ${CX - 40} 136 ${CX - shoulderW} 156
                                                Q ${CX - shoulderW + 6} 186 ${CX - bustW * 0.94} 216
                                                Q ${CX - bustW * 1.04} ${Y_BUST} ${CX - bustW} ${Y_BUST + 6}
                                                Q ${CX - bustW * 0.92} ${Y_BUST + 36} ${CX - ubW} ${Y_BUST + 46}
                                                Q ${CX - waistW * 1.05} ${Y_WAIST - 16} ${CX - waistW} ${Y_WAIST}
                                                Q ${CX - waistW * 0.98} ${Y_WAIST + 20} ${CX - hhW} ${Y_HIP - 40}
                                                Q ${CX - hipW * 1.04} ${Y_HIP - 10} ${CX - hipW} ${Y_HIP}
                                                Q ${CX - hipW * 0.96} ${Y_HIP + 24} ${CX - 3} ${Y_CROTCH}
                                                L ${CX + 3} ${Y_CROTCH}
                                                Q ${CX + hipW * 0.96} ${Y_HIP + 24} ${CX + hipW} ${Y_HIP}
                                                Q ${CX + hipW * 1.04} ${Y_HIP - 10} ${CX + hhW} ${Y_HIP - 40}
                                                Q ${CX + waistW * 0.98} ${Y_WAIST + 20} ${CX + waistW} ${Y_WAIST}
                                                Q ${CX + waistW * 1.05} ${Y_WAIST - 16} ${CX + ubW} ${Y_BUST + 46}
                                                Q ${CX + bustW * 0.92} ${Y_BUST + 36} ${CX + bustW} ${Y_BUST + 6}
                                                Q ${CX + bustW * 1.04} ${Y_BUST} ${CX + bustW * 0.94} 216
                                                Q ${CX + shoulderW - 6} 186 ${CX + shoulderW} 156
                                                Q ${CX + 40} 136 ${CX + 18} 126
                                                Z
                                            `}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.6"
                                        />

                                        {/* COLUMNA VERTEBRAL DORSAL (DESDE C7 HASTA CINTURA Y SACRO) */}
                                        <line
                                            x1={CX}
                                            y1={126}
                                            x2={CX}
                                            y2={Y_WAIST + 48}
                                            stroke="rgba(212, 175, 55, 0.40)"
                                            strokeWidth="1.2"
                                            strokeDasharray="4 4"
                                        />

                                        {/* OMÓPLATOS / ESCÁPULAS ANATÓMICAS DORSALES */}
                                        <path
                                            d={`M ${CX - 22} 175 Q ${CX - 44} 205 ${CX - 24} 235`}
                                            fill="none"
                                            stroke="rgba(212, 175, 55, 0.36)"
                                            strokeWidth="1.2"
                                        />
                                        <path
                                            d={`M ${CX + 22} 175 Q ${CX + 44} 205 ${CX + 24} 235`}
                                            fill="none"
                                            stroke="rgba(212, 175, 55, 0.36)"
                                            strokeWidth="1.2"
                                        />

                                        {/* GUÍA HORIZONTAL DE ANCHO DE ESPALDA (PLIEGUES AXILARES DORSALES) */}
                                        <line
                                            x1={CX - shoulderW * 0.72}
                                            y1={196}
                                            x2={CX + shoulderW * 0.72}
                                            y2={196}
                                            stroke="rgba(212, 175, 55, 0.32)"
                                            strokeWidth="1"
                                            strokeDasharray="3 3"
                                        />

                                        {/* GUÍA HORIZONTAL SUB-AXILAR DORSAL (PROFUNDIDAD DE SISA) */}
                                        <line
                                            x1={CX - bustW * 0.90}
                                            y1={216}
                                            x2={CX + bustW * 0.90}
                                            y2={216}
                                            stroke="rgba(212, 175, 55, 0.28)"
                                            strokeWidth="1"
                                            strokeDasharray="3 3"
                                        />

                                        {/* CURVATURA GLÚTEA Y HENDIDURA INTERGLÚTEA POSTERIOR */}
                                        <path
                                            d={`M ${CX - 6} ${Y_HIP - 12} Q ${CX - hipW * 0.44} ${Y_HIP + 20} ${CX - 3} ${Y_CROTCH + 8}`}
                                            fill="none"
                                            stroke="rgba(212, 175, 55, 0.32)"
                                            strokeWidth="1.2"
                                        />
                                        <path
                                            d={`M ${CX + 6} ${Y_HIP - 12} Q ${CX + hipW * 0.44} ${Y_HIP + 20} ${CX + 3} ${Y_CROTCH + 8}`}
                                            fill="none"
                                            stroke="rgba(212, 175, 55, 0.32)"
                                            strokeWidth="1.2"
                                        />
                                        <line
                                            x1={CX}
                                            y1={Y_HIP - 15}
                                            x2={CX}
                                            y2={Y_CROTCH + 10}
                                            stroke="rgba(212, 175, 55, 0.35)"
                                            strokeWidth="1.2"
                                        />

                                        {/* COSTADILLOS DORSALES DE ALTA COSTURA */}
                                        <path
                                            d={`
                                                M ${CX - shoulderW * 0.52} 146
                                                Q ${CX - shoulderW * 0.45} 200 ${CX - waistW * 0.42} ${Y_WAIST}
                                                Q ${CX - waistW * 0.44} ${Y_WAIST + 30} ${CX - hipW * 0.42} ${Y_HIP}
                                            `}
                                            fill="none"
                                            stroke="rgba(212, 175, 55, 0.22)"
                                            strokeWidth="1"
                                            strokeDasharray="3 4"
                                        />
                                        <path
                                            d={`
                                                M ${CX + shoulderW * 0.52} 146
                                                Q ${CX + shoulderW * 0.45} 200 ${CX + waistW * 0.42} ${Y_WAIST}
                                                Q ${CX + waistW * 0.44} ${Y_WAIST + 30} ${CX + hipW * 0.42} ${Y_HIP}
                                            `}
                                            fill="none"
                                            stroke="rgba(212, 175, 55, 0.22)"
                                            strokeWidth="1"
                                            strokeDasharray="3 4"
                                        />

                                        {/* 4. BRAZOS COMPLETOS POSTERIORES */}
                                        <path
                                            d={`
                                                M ${CX - shoulderW} 156
                                                Q ${146} 210 ${152} 268
                                                Q ${146} 330 ${154} 384
                                                Q ${138} 440 ${142} 488
                                                L ${134} 545
                                                L ${144} 545
                                                L ${148} 488
                                                Q ${158} 440 ${162} 384
                                                Q ${174} 330 ${180} 268
                                                Q ${184} 216 ${CX - bustW * 0.94} 216
                                                Z
                                            `}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.5"
                                        />

                                        <path
                                            d={`
                                                M ${CX + shoulderW} 156
                                                Q ${CX + bustW * 0.94} 216 ${420} 268
                                                Q ${426} 330 ${438} 384
                                                Q ${442} 440 ${452} 488
                                                L ${456} 545
                                                L ${466} 545
                                                L ${464} 488
                                                Q ${462} 440 ${454} 384
                                                Q ${454} 330 ${448} 268
                                                Q ${CX + shoulderW + 6} 210 ${CX + shoulderW} 156
                                                Z
                                            `}
                                            fill="url(#mannequinSilhouetteGrad)"
                                            stroke="url(#coutureStrokeGrad)"
                                            strokeWidth="1.5"
                                        />

                                        <circle cx={CX - shoulderW} cy={156} r={2.8} fill="#D4AF37" opacity={0.6} />
                                        <circle cx={CX + shoulderW} cy={156} r={2.8} fill="#D4AF37" opacity={0.6} />
                                    </g>
                                )}
                            </g>
                        )}

                        {/* EJE CENTRAL ANATÓMICO DISCRETO */}
                        <line
                            x1={CX}
                            y1={30}
                            x2={CX}
                            y2={770}
                            stroke="rgba(167, 131, 80, 0.28)"
                            strokeWidth="1"
                            strokeDasharray="4 6"
                        />

                        {/* TRAVERSAS ANATÓMICAS PRINCIPALES (BUSTO, CINTURA, CADERA) */}
                        {/* Busto (solo en perspectiva frontal) */}
                        {viewPerspective === 'front' && (
                            <line
                                x1={CX - bustW}
                                y1={Y_BUST}
                                x2={CX + bustW}
                                y2={Y_BUST}
                                stroke={selectedCategory === 'bust_torso' ? '#D4AF37' : 'rgba(212, 175, 55, 0.35)'}
                                strokeWidth={selectedCategory === 'bust_torso' ? 1.8 : 0.8}
                                strokeDasharray="3 3"
                            />
                        )}
                        {/* Cintura */}
                        <line
                            x1={CX - waistW}
                            y1={Y_WAIST}
                            x2={CX + waistW}
                            y2={Y_WAIST}
                            stroke={selectedCategory === 'waist_hip' ? '#10B981' : 'rgba(16, 185, 129, 0.35)'}
                            strokeWidth={selectedCategory === 'waist_hip' ? 1.8 : 0.8}
                            strokeDasharray="3 3"
                        />
                        {/* Cadera */}
                        <line
                            x1={CX - hipW}
                            y1={Y_HIP}
                            x2={CX + hipW}
                            y2={Y_HIP}
                            stroke={selectedCategory === 'waist_hip' ? '#10B981' : 'rgba(16, 185, 129, 0.35)'}
                            strokeWidth={selectedCategory === 'waist_hip' ? 1.8 : 0.8}
                            strokeDasharray="3 3"
                        />

                        {/* RESALTE LUMINOSO SEGÚN CATEGORÍA SELECCIONADA */}
                        {selectedCategory === 'bust_torso' && viewPerspective === 'front' && (
                            <ellipse cx={CX} cy={Y_BUST} rx={bustW + 16} ry={42} fill="url(#highlightGlowBust)" />
                        )}
                        {selectedCategory === 'waist_hip' && (
                            <ellipse cx={CX} cy={Y_WAIST + 24} rx={hipW + 16} ry={54} fill="url(#highlightGlowWaist)" />
                        )}

                        {/* DIBUJO DE LÍNEAS DIRECTRICES, ANCHORS Y TRAMOS DIMENSIONALES */}
                        {displayedLabels.map((item) => {
                            const isSelected = selectedMeasureCode === item.code;
                            const isInspected = inspectedCota?.code === item.code || isSelected;
                            const isSummaryHighlight = densityMode === 'summary' && isSummaryPrimaryCota(item.code);
                            const isMatchCat = selectedCategory === 'all' || item.group === selectedCategory;

                            // Jerarquía de densidad visual:
                            // En VISTA RESUMEN, las 5 cotas principales se destacan nítidamente.
                            // Si la cota no es de las 5 principales y la categoría es 'all', y no está seleccionada, se atenúa discretamente.
                            const isDimmed = selectedMeasureCode
                                ? !isSelected
                                : (densityMode === 'summary' && selectedCategory === 'all' && !isSummaryHighlight);

                            const lineOpacity = isSelected || isInspected
                                ? 1.0
                                : isDimmed
                                ? 0.0 // Oculta la directriz para no saturar visualmente el cuerpo
                                : isMatchCat
                                ? (selectedCategory === 'all' ? 0.75 : 0.95)
                                : 0.15;

                            const strokeColor = isInspected || isSelected
                                ? '#D4AF37'
                                : (item.isPrimary || isSummaryHighlight)
                                ? '#E5C788'
                                : item.isRegistered
                                ? '#38BDF8'
                                : '#64748B';

                            const strokeW = isInspected || isSelected ? 2.2 : (item.isPrimary || isSummaryHighlight) ? 1.5 : 0.9;
                            const span = isLongitudinalMeasure(item.code) ? longitudinalSpans[item.code] : undefined;
                            const targetX = span ? span.midX : item.lineStartX;
                            const targetY = span ? span.midY : item.lineStartY;

                            return (
                                <g key={`leader-group-${item.code}`} opacity={lineOpacity}>
                                    {/* Directriz ortogonal en dog-leg (borde de etiqueta -> quiebre lateral despejado -> anchor o tramo) */}
                                    <path
                                        d={`M ${item.lineEndX} ${item.lineEndY} L ${item.turnX} ${item.lineEndY} L ${targetX} ${targetY}`}
                                        fill="none"
                                        stroke={strokeColor}
                                        strokeWidth={strokeW}
                                        strokeDasharray={item.isRegistered ? undefined : '2 3'}
                                    />

                                    {/* Conector terminal en el borde de la etiqueta */}
                                    <circle
                                        cx={item.lineEndX}
                                        cy={item.lineEndY}
                                        r={2}
                                        fill={strokeColor}
                                    />

                                    {span ? (
                                        /* REPRESENTACIÓN RIGUROSA DE MEDIDA LONGITUDINAL: TRAMO DIMENSIONAL CON REMATES Y LÍNEAS DE EXTENSIÓN */
                                        <g id={`span-${item.code}`}>
                                            {/* Líneas de extensión horizontales desde el cuerpo hasta el carril de cota */}
                                            {span.ext1 && (
                                                <line
                                                    x1={span.ext1.x1}
                                                    y1={span.ext1.y1}
                                                    x2={span.ext1.x2}
                                                    y2={span.ext1.y2}
                                                    stroke={strokeColor}
                                                    strokeWidth={1.2}
                                                    strokeDasharray="2 3"
                                                    opacity={0.75}
                                                />
                                            )}
                                            {span.ext2 && (
                                                <line
                                                    x1={span.ext2.x1}
                                                    y1={span.ext2.y1}
                                                    x2={span.ext2.x2}
                                                    y2={span.ext2.y2}
                                                    stroke={strokeColor}
                                                    strokeWidth={1.2}
                                                    strokeDasharray="2 3"
                                                    opacity={0.75}
                                                />
                                            )}

                                            {/* Línea dimensional del tramo continuo */}
                                            <line
                                                x1={span.x1}
                                                y1={span.y1}
                                                x2={span.x2}
                                                y2={span.y2}
                                                stroke={strokeColor}
                                                strokeWidth={isInspected || isSelected ? 2.4 : 1.6}
                                                strokeDasharray={item.isRegistered ? undefined : '3 3'}
                                            />
                                            {/* Remate dimensional extremo inicial */}
                                            <line
                                                x1={span.cap1.x1}
                                                y1={span.cap1.y1}
                                                x2={span.cap1.x2}
                                                y2={span.cap1.y2}
                                                stroke={strokeColor}
                                                strokeWidth={isInspected || isSelected ? 2.4 : 1.8}
                                            />
                                            {/* Remate dimensional extremo final */}
                                            <line
                                                x1={span.cap2.x1}
                                                y1={span.cap2.y1}
                                                x2={span.cap2.x2}
                                                y2={span.cap2.y2}
                                                stroke={strokeColor}
                                                strokeWidth={isInspected || isSelected ? 2.4 : 1.8}
                                            />
                                            {/* Marcador en extremo inicial */}
                                            <circle
                                                cx={span.x1}
                                                cy={span.y1}
                                                r={isInspected || isSelected ? 3.5 : 2.5}
                                                fill={strokeColor}
                                            />
                                            {/* Marcador en extremo final */}
                                            <circle
                                                cx={span.x2}
                                                cy={span.y2}
                                                r={isInspected || isSelected ? 3.5 : 2.5}
                                                fill={strokeColor}
                                            />
                                            {/* Nodo conector donde incide la directriz */}
                                            <circle
                                                cx={span.midX}
                                                cy={span.midY}
                                                r={isInspected || isSelected ? 4 : 2.8}
                                                fill={strokeColor}
                                            />
                                            {/* Halo de inspección en el tramo */}
                                            {(isInspected || isSelected) && (
                                                <circle
                                                    cx={span.midX}
                                                    cy={span.midY}
                                                    r={8}
                                                    fill="none"
                                                    stroke="#D4AF37"
                                                    strokeWidth="1.5"
                                                />
                                            )}
                                        </g>
                                    ) : (
                                        /* MEDIDA REGIONAL O DE CONTORNO: ANCHOR ANATÓMICO PUNTUAL */
                                        <g id={`anchor-${item.code}`}>
                                            {(isInspected || isSelected) && (
                                                <circle
                                                    cx={item.anchorX}
                                                    cy={item.anchorY}
                                                    r={8}
                                                    fill="none"
                                                    stroke="#D4AF37"
                                                    strokeWidth="1.5"
                                                />
                                            )}
                                            <circle
                                                cx={item.anchorX}
                                                cy={item.anchorY}
                                                r={item.isPrimary || isSummaryHighlight ? 4.2 : 3}
                                                fill={strokeColor}
                                            />
                                        </g>
                                    )}
                                </g>
                            );
                        })}
                    </svg>

                    {/* CAPA C.2: ETIQUETAS DE COTAS ANATÓMICAS CON RELAJACIÓN ANTI-COLISIÓN */}
                    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 4 }} pointerEvents="box-none">
                        {displayedLabels.map((item) => {
                            const isSelected = selectedMeasureCode === item.code;
                            const isInspected = inspectedCota?.code === item.code || isSelected;
                            const isSummaryHighlight = densityMode === 'summary' && isSummaryPrimaryCota(item.code);
                            const isMatchCat = selectedCategory === 'all' || item.group === selectedCategory;
                            const isDimmed = selectedMeasureCode
                                ? !isSelected
                                : (densityMode === 'summary' && selectedCategory === 'all' && !isSummaryHighlight);

                            return (
                                <TouchableOpacity
                                    key={`badge-${item.code}`}
                                    style={[
                                        styles.cotaAbsoluteBadge,
                                        {
                                            left: item.badgeX,
                                            top: item.badgeY,
                                            width: item.badgeWidth,
                                            minHeight: item.badgeHeight,
                                        },
                                        isDimmed && styles.cotaDimmed,
                                    ]}
                                    onPress={() => {
                                        const originalDef = ANATOMICAL_COTAS_MAPPING.find((c) => c.code === item.code);
                                        if (originalDef) setInspectedCota(originalDef);
                                    }}
                                    activeOpacity={0.85}
                                >
                                    <View
                                        style={[
                                            styles.cotaBadge,
                                            (item.isPrimary || isSummaryHighlight) && styles.cotaBadgePrimary,
                                            item.isRegistered && styles.cotaBadgeRegistered,
                                            (isMatchCat && selectedCategory !== 'all') && styles.cotaBadgeHighlighted,
                                            (isInspected || isSelected) && styles.cotaBadgeInspected,
                                        ]}
                                    >
                                        <View style={styles.cotaBadgeTopRow}>
                                            <Text
                                                style={[
                                                    styles.cotaLabelText,
                                                    (item.isPrimary || isSummaryHighlight) && styles.cotaLabelTextPrimary,
                                                ]}
                                                numberOfLines={1}
                                            >
                                                {item.label}
                                            </Text>
                                            {item.isRegistered && (
                                                <Text style={styles.checkMark}>✓</Text>
                                            )}
                                        </View>
                                        <Text
                                            style={[
                                                styles.cotaValueText,
                                                (item.isPrimary || isSummaryHighlight) && styles.cotaValueTextPrimary,
                                                !item.isRegistered && styles.cotaValueTextMissing,
                                            ]}
                                        >
                                            {item.valueFormatted}
                                        </Text>
                                        {item.isRegistered && item.unit === 'cm' && (() => {
                                            const mmVal = resolveMeasurementValueMm(measurementsMm, item.code);
                                            return mmVal ? (
                                                <Text style={styles.cotaSubMm}>
                                                    {Math.round(mmVal)} mm
                                                </Text>
                                            ) : null;
                                        })()}
                                    </View>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </View>


            {/* PIE DE TALLER CON ACCIONES OPERATIVAS Y RECTIFICACIÓN HISTÓRICA */}
            <View style={styles.grandFooter}>
                <View style={styles.footerInfoBox}>
                    <Text style={styles.footerInfoTitle}>📐 REGISTRO ANTROPOMÉTRICO OFICIAL</Text>
                    <Text style={styles.footerInfoSub}>
                        {activeCompatibleCotasCount} de {totalCompatibleCotas} cotas calibradas milimétricamente en este maniquí ({sessionAnalysis.totalRegistered} medidas totales registradas).
                    </Text>
                </View>

                <View style={styles.footerActionsRow}>
                    {onOpenExport && (
                        <TouchableOpacity
                            style={styles.footerActionBtnExport}
                            onPress={onOpenExport}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel="Exportar expediente y maniquí"
                        >
                            <Text style={styles.footerActionBtnExportText}>✦ Exportar ⌄</Text>
                        </TouchableOpacity>
                    )}

                    {onNewSession && (
                        <TouchableOpacity
                            style={styles.footerActionBtnSecondary}
                            onPress={onNewSession}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.footerActionBtnSecondaryText}>
                                {session ? '+ Nueva sesión' : '+ Nueva Medida'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {onRectify && (
                        <TouchableOpacity
                            style={styles.footerActionBtnPrimary}
                            onPress={onRectify}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.footerActionBtnPrimaryText}>
                                {session
                                    ? `✏️ Rectificar sesión (v${session.version_number + 1})`
                                    : '⚡ Rectificar / Editar'}
                            </Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* MODAL COMPARTIDO DE GUÍA VISUAL Y FOTOGRÁFICA DE ALTA COSTURA */}
            <AtelierMeasurementGuideModal
                visible={Boolean(inspectedCota)}
                measureCode={inspectedCota?.code || null}
                sessionValueMm={inspectedCota?.code ? measurementsMm[inspectedCota.code] : null}
                showMmEquivalencies={true}
                onClose={() => setInspectedCota(null)}
                onHighlightInMannequin={(code) => {
                    if (onSelectMeasureCode) {
                        onSelectMeasureCode(code);
                    }
                    setInspectedCota(null);
                }}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    outerContainer: {
        backgroundColor: '#0D1117',
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#262D38',
        padding: 16,
        marginBottom: 24,
        width: '100%',
        maxWidth: 660,
        alignSelf: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 10px 28px rgba(0, 0, 0, 0.45)',
            },
            default: {
                elevation: 10,
            },
        }),
    },
    collapsedBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#11161F',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#262D38',
        paddingVertical: 14,
        paddingHorizontal: 18,
        marginBottom: 16,
    },
    collapsedBarLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    collapsedGemPill: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10B981',
        borderWidth: 1,
        borderRadius: 6,
        paddingVertical: 4,
        paddingHorizontal: 8,
    },
    collapsedGemText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#E6D9C8',
    },
    collapsedTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#F8F2E9',
        letterSpacing: 0.3,
    },
    collapsedSub: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 2,
    },
    toggleCollapseBtn: {
        paddingVertical: 6,
        paddingHorizontal: 14,
        borderRadius: 6,
        backgroundColor: 'rgba(167, 131, 80, 0.15)',
        borderWidth: 1,
        borderColor: '#A78350',
    },
    toggleCollapseBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#E5C788',
    },
    grandHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
        paddingBottom: 16,
        marginBottom: 16,
    },
    grandHeaderLeft: {
        flex: 1,
        paddingRight: 16,
    },
    headerRightCol: {
        alignItems: 'flex-end',
        gap: 8,
    },
    eyebrowBadge: {
        alignSelf: 'flex-start',
        paddingVertical: 3.5,
        paddingHorizontal: 9,
        borderRadius: 4,
        backgroundColor: 'rgba(167, 131, 80, 0.16)',
        borderWidth: 1,
        borderColor: '#A78350',
        marginBottom: 6,
    },
    eyebrowText: {
        fontSize: 9.5,
        fontWeight: '800',
        letterSpacing: 1.8,
        color: '#D4AF37',
    },
    grandTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#F8F2E9',
        fontFamily: Platform.OS === 'web' ? 'Playfair Display, Georgia, serif' : undefined,
        letterSpacing: 0.6,
        marginTop: 2,
        marginBottom: 2,
    },
    grandSubtitle: {
        fontSize: 12,
        color: '#C5B59E',
        letterSpacing: 0.3,
        marginTop: 2,
        marginBottom: 4,
    },
    grandIndicatorsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 4,
        flexWrap: 'wrap',
    },
    grandMeasuresCount: {
        fontSize: 11,
        fontWeight: '700',
        color: '#D4AF37',
        letterSpacing: 0.6,
    },
    grandMeasuresSeparator: {
        fontSize: 11,
        color: '#64748B',
    },
    grandCotasCount: {
        fontSize: 11,
        fontWeight: '500',
        color: '#CBD5E1',
    },
    associatedCreationSub: {
        fontSize: 11,
        color: '#C5B59E',
        marginTop: 4,
    },
    sessionStatusCard: {
        backgroundColor: '#12171F',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(167, 131, 80, 0.3)',
        padding: 12,
        minWidth: 190,
    },
    sessionStatusTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
    },
    sessionStatusVersion: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F8F2E9',
    },
    sessionStatusPill: {
        paddingVertical: 2,
        paddingHorizontal: 6,
        borderRadius: 4,
    },
    pillVerified: {
        backgroundColor: 'rgba(167, 131, 80, 0.2)',
        borderWidth: 1,
        borderColor: '#A78350',
    },
    pillCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderWidth: 1,
        borderColor: '#10B981',
    },
    sessionStatusPillText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#E6D9C8',
        letterSpacing: 0.5,
    },
    sessionStatusDate: {
        fontSize: 10,
        color: '#8C8275',
        marginTop: 3,
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 6,
    },
    progressBarTrack: {
        flex: 1,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#262D38',
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#A78350',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#D4AF37',
    },
    progressCaption: {
        fontSize: 9,
        color: '#8C8275',
        marginTop: 4,
        textAlign: 'center',
    },
    collapseToggleBtn: {
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    collapseToggleBtnText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#A0998E',
    },

    // Banner Contextual
    contextBanner: {
        flexDirection: 'column',
        backgroundColor: '#141A22',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2A3442',
        padding: 12,
        marginBottom: 14,
        gap: 10,
    },
    contextBannerLeft: {
        width: '100%',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.07)',
        paddingBottom: 8,
    },
    contextBannerLabel: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
        color: '#A78350',
        marginBottom: 2,
    },
    contextBannerName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    contextBannerSub: {
        fontSize: 11,
        color: '#A0998E',
        marginTop: 2,
    },
    contextBannerRight: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'flex-start',
        width: '100%',
    },
    viewModeSelectorWrap: {
        alignItems: 'flex-start',
    },
    densitySelectorWrap: {
        alignItems: 'flex-start',
    },
    perspectiveSelectorWrap: {
        alignItems: 'flex-start',
    },
    archetypeBtnDisabled: {
        opacity: 0.45,
    },
    torsoNoticeBanner: {
        backgroundColor: 'rgba(167, 131, 80, 0.12)',
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.35)',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        marginBottom: 12,
    },
    torsoNoticeText: {
        fontSize: 11,
        color: '#D1D5DB',
        lineHeight: 16,
    },
    archetypeSelectorWrap: {
        alignItems: 'flex-start',
    },
    archetypeLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#8A99AD',
        letterSpacing: 1,
        marginBottom: 4,
    },
    archetypeButtonsRow: {
        flexDirection: 'row',
        gap: 5,
    },
    archetypeBtn: {
        paddingVertical: 5,
        paddingHorizontal: 9,
        borderRadius: 5,
        backgroundColor: '#17202B',
        borderWidth: 1,
        borderColor: '#2A3647',
        ...Platform.select({
            web: {
                transition: 'all 0.18s ease',
                cursor: 'pointer',
            },
        }),
    },
    archetypeBtnActive: {
        backgroundColor: '#A78350',
        borderColor: '#D4AF37',
        ...Platform.select({
            web: {
                boxShadow: '0 2px 8px rgba(167, 131, 80, 0.35)',
            },
        }),
    },
    archetypeBtnText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    archetypeBtnTextActive: {
        color: '#FFFFFF',
    },

    // Category Tabs
    categoryTabsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 14,
        alignItems: 'center',
    },
    categoryTab: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#141B24',
        borderWidth: 1,
        borderColor: '#263342',
        ...Platform.select({
            web: {
                transition: 'all 0.18s ease',
                cursor: 'pointer',
            },
        }),
    },
    categoryTabInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    categoryTabActive: {
        backgroundColor: '#A78350',
        borderColor: '#D4AF37',
        ...Platform.select({
            web: {
                boxShadow: '0 2px 8px rgba(167, 131, 80, 0.35)',
            },
        }),
    },
    categoryTabText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.4,
    },
    categoryTabTextActive: {
        color: '#FFFFFF',
    },

    // Stage
    stageFrame: {
        position: 'relative',
        height: 840,
        backgroundColor: '#080C12',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#1F2633',
        overflow: 'hidden',
        alignItems: 'center',
        justifyContent: 'flex-start',
    },
    stageCanvas: {
        position: 'relative',
        width: 600,
        height: 840,
    },
    realMannequinContainer: {
        position: 'absolute',
        top: 20,
        left: 0,
        width: 600,
        height: 800,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    realMannequinImage: {
        width: 600,
        height: 800,
        opacity: 0.95,
    },
    realMannequinOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(8, 12, 18, 0.10)',
    },

    cotaAbsoluteBadge: {
        position: 'absolute',
        zIndex: 4,
    },
    cotaDimmed: {
        opacity: 0.22,
    },
    cotaBadgeInspected: {
        borderColor: '#F3E5AB',
        borderWidth: 1.8,
        backgroundColor: 'rgba(50, 40, 24, 0.98)',
        ...Platform.select({
            web: {
                boxShadow: '0 0 14px rgba(212, 175, 55, 0.65)',
            },
        }),
    },

    cotaBadge: {
        backgroundColor: 'rgba(20, 26, 34, 0.96)',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#2D3748',
        paddingVertical: 3,
        paddingHorizontal: 7,
        ...Platform.select({
            web: {
                boxShadow: '0 3px 8px rgba(0, 0, 0, 0.4)',
                cursor: 'pointer',
            },
        }),
    },
    cotaBadgeRegistered: {
        borderColor: 'rgba(167, 131, 80, 0.45)',
        backgroundColor: 'rgba(24, 30, 40, 0.96)',
    },
    cotaBadgePrimary: {
        borderColor: '#D4AF37',
        borderWidth: 1.3,
        backgroundColor: 'rgba(34, 28, 18, 0.96)',
    },
    cotaBadgeHighlighted: {
        borderColor: '#D4AF37',
        backgroundColor: 'rgba(42, 34, 22, 0.98)',
        borderWidth: 1.5,
    },
    cotaBadgeTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    cotaLabelText: {
        fontSize: 8,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.4,
    },
    cotaLabelTextPrimary: {
        color: '#E5C788',
        fontWeight: '800',
    },
    checkMark: {
        fontSize: 8.5,
        fontWeight: '900',
        color: '#10B981',
        marginLeft: 2,
    },
    cotaValueText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#F8F2E9',
        marginTop: 1,
    },
    cotaValueTextPrimary: {
        color: '#F3E5AB',
        fontSize: 12,
        fontWeight: '800',
    },
    cotaValueTextMissing: {
        color: '#556375',
        fontSize: 9.5,
        fontWeight: '500',
        fontStyle: 'italic',
    },
    cotaSubMm: {
        fontSize: 7.5,
        color: '#7C7368',
        marginTop: 0.5,
    },

    // Footer
    grandFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
        flexWrap: 'wrap',
        gap: 10,
    },
    footerInfoBox: {
        flex: 1,
        minWidth: 200,
    },
    footerInfoTitle: {
        fontSize: 9.5,
        fontWeight: '800',
        color: '#A78350',
        letterSpacing: 1,
    },
    footerInfoSub: {
        fontSize: 10.5,
        color: '#94A3B8',
        marginTop: 2,
    },
    footerActionsRow: {
        flexDirection: 'row',
        gap: 8,
        alignItems: 'center',
        flexWrap: 'wrap',
    },
    footerActionBtnExport: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: 'rgba(212, 175, 55, 0.16)',
        borderWidth: 1.5,
        borderColor: '#D4AF37',
    },
    footerActionBtnExportText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#E5C788',
        letterSpacing: 0.3,
    },
    footerActionBtnSecondary: {
        paddingVertical: 7,
        paddingHorizontal: 12,
        borderRadius: 6,
        backgroundColor: '#161C24',
        borderWidth: 1,
        borderColor: '#2D3748',
    },
    footerActionBtnSecondaryText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#D1D5DB',
    },
    footerActionBtnPrimary: {
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 6,
        backgroundColor: '#A78350',
    },
    footerActionBtnPrimaryText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalCard: {
        width: '100%',
        maxWidth: 480,
        backgroundColor: '#121720',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#A78350',
        padding: 22,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
        paddingBottom: 12,
        marginBottom: 14,
    },
    modalEyebrow: {
        fontSize: 9,
        fontWeight: '800',
        color: '#D4AF37',
        letterSpacing: 1.2,
    },
    modalTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        marginTop: 2,
    },
    modalCode: {
        fontSize: 10,
        color: '#717D91',
        marginTop: 2,
    },
    modalCloseBtn: {
        padding: 6,
    },
    modalCloseText: {
        fontSize: 16,
        color: '#94A3B8',
        fontWeight: '700',
    },
    modalBody: {
        gap: 14,
    },
    modalMetricBox: {
        backgroundColor: '#19222E',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#2A3648',
        padding: 12,
        flexDirection: 'row',
        alignItems: 'baseline',
        justifyContent: 'space-between',
    },
    modalMetricLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: '#A0998E',
        letterSpacing: 0.5,
    },
    modalMetricVal: {
        fontSize: 16,
        fontWeight: '800',
        color: '#F8F2E9',
    },
    modalMetricValSub: {
        fontSize: 12,
        fontWeight: '500',
        color: '#8C8275',
    },
    modalSection: {
        gap: 4,
    },
    modalSectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: '#A78350',
        letterSpacing: 0.8,
    },
    modalSectionContent: {
        fontSize: 12,
        color: '#D1D5DB',
        lineHeight: 18,
    },
    modalFooterRow: {
        marginTop: 6,
        alignItems: 'flex-end',
    },
    modalDoneBtn: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 6,
        backgroundColor: '#A78350',
    },
    modalDoneBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    autoSwitchBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(56, 189, 248, 0.12)',
        borderColor: '#38BDF8',
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 14,
        marginBottom: 12,
    },
    autoSwitchNoticeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#E0F2FE',
        flex: 1,
    },
    highlightedCotaBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(212, 175, 55, 0.14)',
        borderColor: '#D4AF37',
        borderWidth: 1.5,
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 16,
        marginBottom: 12,
    },
    highlightedCotaLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    highlightedCotaBadge: {
        backgroundColor: '#D4AF37',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    highlightedCotaBadgeText: {
        fontSize: 10,
        fontWeight: '900',
        color: '#0D1117',
        letterSpacing: 0.5,
    },
    highlightedCotaTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: '#F8F2E9',
        letterSpacing: 0.3,
    },
    highlightedCotaVal: {
        fontSize: 13,
        fontWeight: '800',
        color: '#E5C788',
    },
    showAllCotasBtn: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderColor: '#E5C788',
        borderWidth: 1,
        borderRadius: 6,
        paddingVertical: 6,
        paddingHorizontal: 12,
    },
    showAllCotasBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#F8F2E9',
    },
});
