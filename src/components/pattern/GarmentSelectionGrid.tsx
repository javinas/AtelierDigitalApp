// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: SELECTOR VISUAL DE PRENDAS (STUDIO WORKFLOW OPCIÓN B)
// Archivo: src/components/pattern/GarmentSelectionGrid.tsx
// ==============================================================================
// Cuadrícula visual ergonómica con bocetos de alta costura a línea fina,
// modal de ampliación fotográfica en alta definición y desglose técnico de tallas/medidas requeridas.
// ==============================================================================

import React, { useState } from 'react';
import {
    Image,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    useWindowDimensions,
} from 'react-native';
import { GarmentType } from '../../types/pattern/pattern';
import { GARMENT_PACKAGES } from '../../engine/pattern/catalog/garmentPackages';
import { MEASUREMENT_MAP } from '../../engine/pattern/catalog/masterCatalog';

export const GARMENT_IMAGES: Record<string, any> = {
    skirt: require('../../../assets/garments/skirt.jpg'),
    bodice: require('../../../assets/garments/bodice.jpg'),
    pants: require('../../../assets/garments/pants.jpg'),
    dress: require('../../../assets/garments/dress.jpg'),
    sleeve: require('../../../assets/garments/sleeve.jpg'),
    blouse: require('../../../assets/garments/blouse.jpg'),
    shirt: require('../../../assets/garments/shirt.jpg'),
    corset: require('../../../assets/garments/corset.jpg'),
    jacket: require('../../../assets/garments/jacket.jpg'),
    coat: require('../../../assets/garments/coat.jpg'),
    shirt_dress: require('../../../assets/garments/shirt_dress.jpg'),
    tailored_vest: require('../../../assets/garments/tailored_vest.jpg'),
    short: require('../../../assets/garments/short.jpg'),
    cargo_pants: require('../../../assets/garments/cargo_pants.jpg'),
    trench_coat: require('../../../assets/garments/trench_coat.jpg'),
    atelier_robe: require('../../../assets/garments/atelier_robe.jpg'),
    evening_gown: require('../../../assets/garments/evening_gown.jpg'),
    bridal_gown: require('../../../assets/garments/bridal_gown.jpg'),
    draped_asymmetric_dress: require('../../../assets/garments/draped_asymmetric_dress.jpg'),
    bomber_jacket: require('../../../assets/garments/bomber_jacket.jpg'),
    denim_couture_jacket: require('../../../assets/garments/denim_couture_jacket.jpg'),
};

interface GarmentCardInfo {
    type: GarmentType | 'corset';
    name: string;
    category: string;
    description: string;
    recommendedEase: string;
    piecesCount: number;
    iconSvgPath?: string;
    isUpcoming?: boolean;
}

export const GARMENT_CARDS: GarmentCardInfo[] = [
    {
        type: 'skirt',
        name: 'Falda Base & Evasé',
        category: 'Inferior / Silueta',
        description: 'Trazado paramétrico delantero y espalda con pinzas anatómicas y evasé regulable.',
        recommendedEase: '20 mm (Cintura) · 30 mm (Cadera)',
        piecesCount: 2,
    },
    {
        type: 'bodice',
        name: 'Corpiño / Cuerpo Base',
        category: 'Superior / Estructurado',
        description: 'Patrón maestro de busto con desarrollo de pinzas de talle, hombro y costadillo.',
        recommendedEase: '40 mm (Busto) · 30 mm (Cintura)',
        piecesCount: 2,
    },
    {
        type: 'pants',
        name: 'Pantalón Sastre',
        category: 'Inferior / Sastrería',
        description: 'Construcción con tiro anatómico, curva de entrepierna y aplomo de corte recto o palazzo.',
        recommendedEase: '20 mm (Cintura) · 40 mm (Cadera)',
        piecesCount: 2,
    },
    {
        type: 'dress',
        name: 'Vestido Princesa',
        category: 'Completa / Alta Costura',
        description: 'Unión anatómica corpiño y falda con corte francés, entalle estilizado y manga sastre integrada.',
        recommendedEase: '35 mm (Busto) · 25 mm (Cintura)',
        piecesCount: 5,
    },
    {
        type: 'sleeve',
        name: 'Manga Anatómica',
        category: 'Complemento / Sastrería',
        description: 'Copa proporcional al perímetro de sisa con embebido técnico y sangría de codo.',
        recommendedEase: '30 mm (Bíceps) · 15 mm (Puño)',
        piecesCount: 1,
    },
    {
        type: 'blouse',
        name: 'Blusa Clásica Fluida',
        category: 'Superior / Fluida',
        description: 'Desahogo generoso para sedas y gasas, cruce de botonadura, escote adaptable y manga fluida.',
        recommendedEase: '60 mm (Busto) · 50 mm (Cintura)',
        piecesCount: 3,
    },
    {
        type: 'shirt',
        name: 'Camisa de Alta Costura',
        category: 'Superior / Sastrería',
        description: 'Construcción sastre con canesú, cuello camisero de 2 piezas, cruce asimétrico, mangas, puños y tapeta.',
        recommendedEase: '80 mm (Busto) · 60 mm (Muñeca)',
        piecesCount: 11,
    },
    {
        type: 'corset',
        name: 'Corpiño / Corsé de Alta Costura',
        category: 'Estructurada / Alta Costura',
        description: 'Estructura anatómica de 5 paneles dobles simétricos con reducción activa de cintura y soporte óseo.',
        recommendedEase: '-20 mm (Cintura) · 0 mm (Busto)',
        piecesCount: 10,
    },
    {
        type: 'jacket',
        name: 'Chaqueta Sastre de Alta Costura',
        category: 'Exterior / Sastrería',
        description: 'Sastrería estructurada con solapa de muesca, costadillos anatómicos, cuello de 2 piezas, manga sastre de 2 hojas y carteras.',
        recommendedEase: '80 mm (Busto) · 60 mm (Cintura)',
        piecesCount: 16,
    },
    {
        type: 'coat',
        name: 'Abrigo Sastre de Alta Costura',
        category: 'Exterior / Sastrería',
        description: 'Abrigo envolvente con solapa amplia, costadillos, abertura dorsal, cuello de 2 piezas, manga de 2 hojas, carteras y cinturón.',
        recommendedEase: '110 mm (Busto) · 90 mm (Cintura)',
        piecesCount: 17,
    },
    {
        type: 'shirt_dress',
        name: 'Vestido Camisero',
        category: 'Híbrida / Alta Costura',
        description: 'Fusión de cuerpo camisero estructurado con falda, cuello camisero, tapeta abotonada, manga y cinturón de lazada.',
        recommendedEase: '60 mm (Busto) · 40 mm (Cintura)',
        piecesCount: 13,
    },
    {
        type: 'tailored_vest',
        name: 'Chaleco Sastre',
        category: 'Superior / Sastrería',
        description: 'Torso sastre estructurado sin mangas, con sisa limpia, costadillos, vistas interiores, bolsillos ojal y ceñidor dorsal.',
        recommendedEase: '40 mm (Busto) · 30 mm (Cintura)',
        piecesCount: 7,
    },
    {
        type: 'short',
        name: 'Short Sastre',
        category: 'Inferior / Sastrería',
        description: 'Construcción con tiro anatómico, entrepierna corta, pretina con cruce y bolsillos sastre interiores.',
        recommendedEase: '20 mm (Cintura) · 40 mm (Cadera)',
        piecesCount: 5,
    },
    {
        type: 'cargo_pants',
        name: 'Pantalón Cargo / Safari',
        category: 'Inferior / Safari-Couture',
        description: 'Pantalón con bolsillos laterales fuelle tridimensionales 3D, carteras en pico, bolsillos traseros safari y pretina reforzada.',
        recommendedEase: '30 mm (Cintura) · 60 mm (Cadera)',
        piecesCount: 7,
    },
    {
        type: 'trench_coat',
        name: 'Gabardina / Trench Coat',
        category: 'Exterior / Alta Costura',
        description: 'Trench técnico de doble botonadura con storm flap dorsal, gun flap frontal, cuello convertible, charreteras y cinturón con trabillas.',
        recommendedEase: '110 mm (Busto) · 100 mm (Cintura)',
        piecesCount: 13,
    },
    {
        type: 'atelier_robe',
        name: 'Bata de Taller',
        category: 'Exterior / Kimono-Couture',
        description: 'Prenda envolvente de atelier con cruce amplio, hombro caído, vista corrida, bolsillos de parche para herramientas y cinturón de lazada.',
        recommendedEase: '140 mm (Busto) · 140 mm (Cintura)',
        piecesCount: 8,
    },
    {
        type: 'evening_gown',
        name: 'Vestido de Gala',
        category: 'Alta Ocasión / Gala',
        description: 'Corpiño corazón de 4 paneles estructurados, falda sirena entallada a la rodilla, cola posterior y godet de vuelo.',
        recommendedEase: '10 mm (Busto) · 10 mm (Cintura)',
        piecesCount: 7,
    },
    {
        type: 'bridal_gown',
        name: 'Vestido de Novia',
        category: 'Nupcial / Haute Couture',
        description: 'Bloque nupcial de gala con copas estructuradas, soporte submamario, falda majestuosa de vuelo con cola de capilla y peplum interior.',
        recommendedEase: '0 mm (Busto) · 0 mm (Cintura)',
        piecesCount: 8,
    },
    {
        type: 'draped_asymmetric_dress',
        name: 'Vestido Drapeado / Asimétrico',
        category: 'Modelado / Alta Costura',
        description: 'Vestido de un solo hombro con geometría asimétrica real, drapeado en cascada diagonal y ruedo desigual high-low.',
        recommendedEase: '25 mm (Busto) · 20 mm (Cintura)',
        piecesCount: 6,
    },
    {
        type: 'bomber_jacket',
        name: 'Cazadora / Bomber Jacket',
        category: 'Sport-Couture / Cazadora',
        description: 'Chaqueta corta blusada con cuello, pretina y puños de canalé elástico, cremallera delantera y bolsillos de ojal inclinados.',
        recommendedEase: '120 mm (Busto) · 80 mm (Cintura)',
        piecesCount: 7,
    },
    {
        type: 'denim_couture_jacket',
        name: 'Chaqueta Vaquera / Denim Couture',
        category: 'Western-Couture / Estructurada',
        description: 'Chaqueta vaquera estructurada con canesús delantero y trasero, centro abotonado con tapeta, costadillos, cuello camisero, puños y carteras western.',
        recommendedEase: '85 mm (Busto) · 70 mm (Cintura)',
        piecesCount: 14,
    },
];

// ==============================================================================
// TABLA DE TALLAS ESTÁNDAR DE ALTA COSTURA (T36 A T46)
// ==============================================================================
export interface StandardSizeReference {
    code: string;
    label: string;
    euroTag: string;
    isWorkshopBase?: boolean;
    description: string;
    measures: Record<string, number>; // en mm
}

export const HAUTE_COUTURE_STANDARD_SIZES: StandardSizeReference[] = [
    {
        code: 'T36',
        label: 'Talla 36 (XS)',
        euroTag: 'EU 36 · US 4 · UK 8',
        description: 'Silueta esbelta con proporciones de alta costura reducida',
        measures: {
            contorno_busto: 840,
            contorno_cintura: 640,
            contorno_cadera: 900,
            contorno_cuello: 350,
            contorno_bajo_busto: 710,
            ancho_espalda: 340,
            ancho_pecho: 320,
            ancho_hombros: 380,
            largo_hombro: 120,
            largo_talle_delantero: 430,
            largo_talle_espalda: 405,
            altura_busto: 250,
            separacion_busto: 180,
            largo_brazo: 580,
            contorno_biceps: 265,
            contorno_muneca: 160,
            profundidad_cintura_cadera: 195,
            largo_falda: 590,
            profundidad_tiro: 250,
            largo_exterior_pierna: 1010,
            largo_entrepierna: 760,
            contorno_muslo: 530,
            contorno_rodilla: 360,
            contorno_tobillo: 220,
            largo_blusa: 580,
            largo_camisa: 670,
            largo_chaqueta: 640,
            largo_abrigo: 1080,
        },
    },
    {
        code: 'T38',
        label: 'Talla 38 (S)',
        euroTag: 'EU 38 · US 6 · UK 10',
        description: 'Base francesa clásica de pasarela y confección a medida',
        measures: {
            contorno_busto: 880,
            contorno_cintura: 680,
            contorno_cadera: 940,
            contorno_cuello: 360,
            contorno_bajo_busto: 750,
            ancho_espalda: 350,
            ancho_pecho: 330,
            ancho_hombros: 390,
            largo_hombro: 125,
            largo_talle_delantero: 440,
            largo_talle_espalda: 410,
            altura_busto: 260,
            separacion_busto: 190,
            largo_brazo: 590,
            contorno_biceps: 280,
            contorno_muneca: 165,
            profundidad_cintura_cadera: 200,
            largo_falda: 600,
            profundidad_tiro: 260,
            largo_exterior_pierna: 1020,
            largo_entrepierna: 760,
            contorno_muslo: 550,
            contorno_rodilla: 370,
            contorno_tobillo: 230,
            largo_blusa: 590,
            largo_camisa: 680,
            largo_chaqueta: 650,
            largo_abrigo: 1100,
        },
    },
    {
        code: 'T40',
        label: 'Talla 40 (M)',
        euroTag: 'EU 40 · US 8 · UK 12',
        isWorkshopBase: true,
        description: 'Patrón maestro de atelier (maniquí Stockman estándar de taller)',
        measures: {
            contorno_busto: 920,
            contorno_cintura: 720,
            contorno_cadera: 980,
            contorno_cuello: 370,
            contorno_bajo_busto: 780,
            ancho_espalda: 360,
            ancho_pecho: 340,
            ancho_hombros: 400,
            largo_hombro: 128,
            largo_talle_delantero: 450,
            largo_talle_espalda: 415,
            altura_busto: 270,
            separacion_busto: 200,
            largo_brazo: 600,
            contorno_biceps: 295,
            contorno_muneca: 170,
            profundidad_cintura_cadera: 205,
            largo_falda: 620,
            profundidad_tiro: 270,
            largo_exterior_pierna: 1030,
            largo_entrepierna: 760,
            contorno_muslo: 570,
            contorno_rodilla: 380,
            contorno_tobillo: 240,
            largo_blusa: 600,
            largo_camisa: 700,
            largo_chaqueta: 660,
            largo_abrigo: 1120,
        },
    },
    {
        code: 'T42',
        label: 'Talla 42 (L)',
        euroTag: 'EU 42 · US 10 · UK 14',
        description: 'Línea estructurada con amplitud torácica y pélvica',
        measures: {
            contorno_busto: 960,
            contorno_cintura: 760,
            contorno_cadera: 1020,
            contorno_cuello: 380,
            contorno_bajo_busto: 820,
            ancho_espalda: 370,
            ancho_pecho: 350,
            ancho_hombros: 410,
            largo_hombro: 130,
            largo_talle_delantero: 460,
            largo_talle_espalda: 420,
            altura_busto: 280,
            separacion_busto: 210,
            largo_brazo: 610,
            contorno_biceps: 310,
            contorno_muneca: 175,
            profundidad_cintura_cadera: 210,
            largo_falda: 630,
            profundidad_tiro: 280,
            largo_exterior_pierna: 1040,
            largo_entrepierna: 760,
            contorno_muslo: 590,
            contorno_rodilla: 390,
            contorno_tobillo: 250,
            largo_blusa: 610,
            largo_camisa: 710,
            largo_chaqueta: 670,
            largo_abrigo: 1140,
        },
    },
    {
        code: 'T44',
        label: 'Talla 44 (XL)',
        euroTag: 'EU 44 · US 12 · UK 16',
        description: 'Graduación anatómica confortable para sastrería y corsetería',
        measures: {
            contorno_busto: 1000,
            contorno_cintura: 800,
            contorno_cadera: 1060,
            contorno_cuello: 390,
            contorno_bajo_busto: 860,
            ancho_espalda: 380,
            ancho_pecho: 360,
            ancho_hombros: 420,
            largo_hombro: 133,
            largo_talle_delantero: 470,
            largo_talle_espalda: 425,
            altura_busto: 290,
            separacion_busto: 220,
            largo_brazo: 615,
            contorno_biceps: 325,
            contorno_muneca: 180,
            profundidad_cintura_cadera: 215,
            largo_falda: 640,
            profundidad_tiro: 290,
            largo_exterior_pierna: 1050,
            largo_entrepierna: 760,
            contorno_muslo: 610,
            contorno_rodilla: 400,
            contorno_tobillo: 260,
            largo_blusa: 620,
            largo_camisa: 720,
            largo_chaqueta: 680,
            largo_abrigo: 1160,
        },
    },
    {
        code: 'T46',
        label: 'Talla 46 (XXL)',
        euroTag: 'EU 46 · US 14 · UK 18',
        description: 'Proporciones adaptadas con equilibrio de caída y desahogos amplios',
        measures: {
            contorno_busto: 1040,
            contorno_cintura: 840,
            contorno_cadera: 1100,
            contorno_cuello: 400,
            contorno_bajo_busto: 900,
            ancho_espalda: 390,
            ancho_pecho: 370,
            ancho_hombros: 430,
            largo_hombro: 136,
            largo_talle_delantero: 480,
            largo_talle_espalda: 430,
            altura_busto: 300,
            separacion_busto: 230,
            largo_brazo: 620,
            contorno_biceps: 340,
            contorno_muneca: 185,
            profundidad_cintura_cadera: 220,
            largo_falda: 650,
            profundidad_tiro: 300,
            largo_exterior_pierna: 1060,
            largo_entrepierna: 760,
            contorno_muslo: 630,
            contorno_rodilla: 410,
            contorno_tobillo: 270,
            largo_blusa: 630,
            largo_camisa: 730,
            largo_chaqueta: 690,
            largo_abrigo: 1180,
        },
    },
];

interface GarmentSelectionGridProps {
    selectedGarment?: GarmentType | null;
    onSelectGarment: (garment: GarmentType) => void;
    onProceedToCad?: () => void;
    generatedPiecesCount?: number;
    activeMeasurementsMm?: Record<string, number>;
    clientName?: string;
    sessionLabel?: string;
}

export function GarmentSelectionGrid({
    selectedGarment,
    onSelectGarment,
    onProceedToCad,
    generatedPiecesCount,
    activeMeasurementsMm,
    clientName,
    sessionLabel,
}: GarmentSelectionGridProps) {
    const { width: windowWidth } = useWindowDimensions();
    const isDesktopWide = windowWidth >= 780;
    const isDesktop3Col = windowWidth >= 880;
    const isTablet2Col = windowWidth >= 580 && windowWidth < 880;

    // Estado del modal de inspección y ampliación
    const [inspectedGarment, setInspectedGarment] = useState<GarmentCardInfo | null>(null);
    const [activeDetailTab, setActiveDetailTab] = useState<'required_measures' | 'size_table'>('required_measures');
    const [selectedSizeCode, setSelectedSizeCode] = useState<string>('T40');

    const selectedCard = selectedGarment ? GARMENT_CARDS.find((g) => g.type === selectedGarment) : null;
    const selectedEffectivePieces = (typeof generatedPiecesCount === 'number' && generatedPiecesCount > 0)
        ? generatedPiecesCount
        : (selectedCard?.piecesCount ?? 0);

    const inspectedPackage = inspectedGarment ? GARMENT_PACKAGES[inspectedGarment.type as GarmentType] : null;
    const inspectedEffectivePieces = inspectedGarment
        ? ((selectedGarment === inspectedGarment.type && typeof generatedPiecesCount === 'number' && generatedPiecesCount > 0)
            ? generatedPiecesCount
            : inspectedGarment.piecesCount)
        : 0;

    const currentStandardSize = HAUTE_COUTURE_STANDARD_SIZES.find((s) => s.code === selectedSizeCode) || HAUTE_COUTURE_STANDARD_SIZES[2];

    return (
        <View style={styles.container}>
            {/* Cabecera del Paso 2: Selección de Prenda */}
            <View style={styles.headerRow}>
                <View style={styles.headerTitles}>
                    <View style={styles.badgeRow}>
                        <Text style={styles.stepBadge}>PASO 2</Text>
                        <Text style={styles.stepSubtitle}>STUDIO WORKFLOW</Text>
                    </View>
                    <Text style={styles.mainTitle}>PRENDA DE ALTA COSTURA</Text>
                    <Text style={styles.description}>
                        Selecciona la arquitectura de corte a trazar o haz clic en cualquier prenda para ampliarla y ver sus tallas y medidas requeridas
                    </Text>
                </View>
            </View>

            {/* Cuadrícula de Tarjetas de Prendas con Fotografías Editoriales */}
            <View style={styles.gridContainer}>
                {GARMENT_CARDS.map((garment, index) => {
                    const isSelected = selectedGarment === garment.type;
                    const isUpcoming = garment.isUpcoming;
                    const effectivePieces = (isSelected && typeof generatedPiecesCount === 'number' && generatedPiecesCount > 0)
                        ? generatedPiecesCount
                        : garment.piecesCount;

                    return (
                        <TouchableOpacity
                            key={garment.type}
                            style={[
                                styles.garmentCard,
                                isDesktop3Col && styles.garmentCard3Col,
                                isTablet2Col && styles.garmentCard2Col,
                                isSelected && styles.garmentCardSelected,
                                isUpcoming && styles.garmentCardUpcoming,
                            ]}
                            onPress={() => {
                                if (!isUpcoming) {
                                    onSelectGarment(garment.type as GarmentType);
                                }
                            }}
                            activeOpacity={isUpcoming ? 1 : 0.88}
                            disabled={isUpcoming}
                        >
                            {/* Etiqueta de Estado en la tarjeta */}
                            <View style={styles.cardTopBadgeRow}>
                                <Text style={styles.categoryText}>{garment.category}</Text>
                                {isSelected ? (
                                    <View style={styles.selectedBadge}>
                                        <Text style={styles.selectedBadgeText}>✓ ACTIVA</Text>
                                    </View>
                                ) : isUpcoming ? (
                                    <View style={styles.upcomingBadge}>
                                        <Text style={styles.upcomingBadgeText}>PRÓXIMAMENTE</Text>
                                    </View>
                                ) : null}
                            </View>

                            {/* Fotografía Editorial de Alta Costura con Acción de Ampliación */}
                            <TouchableOpacity
                                style={[
                                    styles.photoContainer,
                                    isSelected && styles.photoContainerSelected,
                                ]}
                                onPress={() => setInspectedGarment(garment)}
                                activeOpacity={0.85}
                            >
                                <Image
                                    source={GARMENT_IMAGES[garment.type]}
                                    style={styles.garmentPhoto}
                                    resizeMode="cover"
                                />
                                <View style={styles.photoOverlayBadge}>
                                    <Text style={styles.photoOverlayBadgeText}>
                                        {effectivePieces} {effectivePieces === 1 ? 'Pieza' : 'Piezas'}
                                    </Text>
                                </View>
                                <View style={styles.photoZoomBadge}>
                                    <Text style={styles.photoZoomBadgeText}>🔍 Ampliar</Text>
                                </View>
                            </TouchableOpacity>

                            {/* Nombre y Detalles de la Prenda */}
                            <Text
                                style={[
                                    styles.garmentName,
                                    isSelected && styles.garmentNameSelected,
                                ]}
                            >
                                {garment.name}
                            </Text>

                            <Text style={styles.garmentDesc} numberOfLines={2}>
                                {garment.description}
                            </Text>

                            {/* Ficha técnica rápida en el pie de la card */}
                            <View style={styles.cardFooter}>
                                <View style={styles.footerItem}>
                                    <Text style={styles.footerLabel}>Desahogo:</Text>
                                    <Text style={styles.footerVal} numberOfLines={1}>
                                        {garment.recommendedEase}
                                    </Text>
                                </View>
                                <View style={styles.footerItemRight}>
                                    <Text style={styles.piecesPill}>
                                        {effectivePieces} {effectivePieces === 1 ? 'Pieza' : 'Piezas'}
                                    </Text>
                                </View>
                            </View>

                            {/* Fila de Acciones: Inspeccionar Tallas + Seleccionar */}
                            <View style={styles.cardActionRow}>
                                <TouchableOpacity
                                    style={styles.inspectActionBtn}
                                    onPress={() => setInspectedGarment(garment)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.inspectActionBtnText}>🔍 Tallas & Detalles</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.selectActionBtn,
                                        isSelected && styles.selectActionBtnSelected,
                                        isUpcoming && styles.selectActionBtnUpcoming,
                                    ]}
                                    onPress={() => {
                                        if (!isUpcoming) {
                                            onSelectGarment(garment.type as GarmentType);
                                        }
                                    }}
                                    activeOpacity={0.8}
                                    disabled={isUpcoming}
                                >
                                    <Text
                                        style={[
                                            styles.selectActionBtnText,
                                            isSelected && styles.selectActionBtnTextSelected,
                                        ]}
                                    >
                                        {isSelected ? '✓ SELECCIONADA' : isUpcoming ? 'EN DESARROLLO' : 'SELECCIONAR'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* Banner de Acción Rápida para Continuar a Mesa CAD */}
            {onProceedToCad && (
                <View style={styles.proceedBanner}>
                    <View style={styles.proceedInfoCol}>
                        <View style={styles.proceedBadgeRow}>
                            <Text style={styles.proceedStepBadge}>PASO 3</Text>
                            <Text style={styles.proceedPreLabel}>ARQUITECTURA DE CORTE ACTIVA</Text>
                        </View>
                        <Text style={styles.proceedTitle}>
                            {selectedCard?.name || 'Prenda Seleccionada'}
                        </Text>
                        <Text style={styles.proceedMeta}>
                            {selectedEffectivePieces} {selectedEffectivePieces === 1 ? 'Pieza técnica' : 'Piezas técnicas'} · Desahogo recomendado: {selectedCard?.recommendedEase}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.proceedBtn}
                        onPress={onProceedToCad}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.proceedBtnText}>✦ Pasar a Mesa CAD →</Text>
                    </TouchableOpacity>
                </View>
            )}

            {/* ============================================================================== */}
            {/* MODAL DE ALTA DEFINICIÓN: AMPLIACIÓN DE PRENDA & DESGLOSE TÉCNICO DE TALLAS */}
            {/* ============================================================================== */}
            <Modal
                visible={!!inspectedGarment}
                animationType="fade"
                transparent
                onRequestClose={() => setInspectedGarment(null)}
            >
                <View style={styles.modalBackdrop}>
                    <View style={[styles.modalBox, isDesktopWide && styles.modalBoxWide]}>
                        {/* Cabecera del Modal */}
                        <View style={styles.modalHeader}>
                            <View style={styles.modalHeaderLeft}>
                                <View style={styles.modalTopBadgeRow}>
                                    <Text style={styles.modalSuperBadge}>INSPECCIÓN DE ALTA COSTURA</Text>
                                    <Text style={styles.modalCategoryBadge}>{inspectedGarment?.category}</Text>
                                </View>
                                <Text style={styles.modalTitle}>{inspectedGarment?.name}</Text>
                                <Text style={styles.modalSubtitle}>
                                    {inspectedEffectivePieces} {inspectedEffectivePieces === 1 ? 'Pieza técnica' : 'Piezas de corte maestro'} · Holgura sugerida: {inspectedGarment?.recommendedEase}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.modalCloseBtn}
                                onPress={() => setInspectedGarment(null)}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.modalCloseBtnText}>✕</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Contenido del Modal (Dividido en 2 Columnas en Pantalla Ancha) */}
                        <View style={[styles.modalBodyRow, isDesktopWide ? styles.modalBodyWide : styles.modalBodyColumn]}>
                            {/* Columna Izquierda: Imagen Ampliada en Alta Definición y Ficha */}
                            <View style={[styles.modalLeftColumn, isDesktopWide && styles.modalLeftColumnWide]}>
                                <View style={styles.largeImageFrame}>
                                    {inspectedGarment && (
                                        <Image
                                            source={GARMENT_IMAGES[inspectedGarment.type]}
                                            style={styles.largeGarmentImage}
                                            resizeMode="cover"
                                        />
                                    )}
                                    <View style={styles.largeImageOverlay}>
                                        <Text style={styles.largeImageOverlayText}>
                                            {inspectedEffectivePieces} PIEZAS DE CORTE
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.garmentSpecBox}>
                                    <Text style={styles.garmentSpecTitle}>Arquitectura y Silueta</Text>
                                    <Text style={styles.garmentSpecDesc}>{inspectedGarment?.description}</Text>
                                    {inspectedPackage?.methodReference && (
                                        <Text style={styles.garmentSpecMethod}>
                                            📐 Método: {inspectedPackage.methodReference}
                                        </Text>
                                    )}
                                </View>
                            </View>

                            {/* Columna Derecha: Pestañas de Medidas Requeridas y Tabla de Tallas */}
                            <View style={[styles.modalRightColumn, isDesktopWide && styles.modalRightColumnWide]}>
                                {/* Selector de Pestañas del Modal */}
                                <View style={styles.modalTabRow}>
                                    <TouchableOpacity
                                        style={[
                                            styles.modalTabBtn,
                                            activeDetailTab === 'required_measures' && styles.modalTabBtnActive,
                                        ]}
                                        onPress={() => setActiveDetailTab('required_measures')}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.modalTabBtnText,
                                                activeDetailTab === 'required_measures' && styles.modalTabBtnTextActive,
                                            ]}
                                        >
                                            📐 Medidas Requeridas ({inspectedPackage?.required.length || 0})
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.modalTabBtn,
                                            activeDetailTab === 'size_table' && styles.modalTabBtnActive,
                                        ]}
                                        onPress={() => setActiveDetailTab('size_table')}
                                        activeOpacity={0.8}
                                    >
                                        <Text
                                            style={[
                                                styles.modalTabBtnText,
                                                activeDetailTab === 'size_table' && styles.modalTabBtnTextActive,
                                            ]}
                                        >
                                            📊 Tabla de Tallas (T36–T46)
                                        </Text>
                                    </TouchableOpacity>
                                </View>

                                {/* CONTENIDO: PESTAÑA 1 - MEDIDAS REQUERIDAS */}
                                {activeDetailTab === 'required_measures' && (
                                    <ScrollView style={styles.modalScrollArea} showsVerticalScrollIndicator>
                                        {/* Barra de Estado con la Clienta Activa */}
                                        <View style={styles.clientStatusBar}>
                                            <View>
                                                <Text style={styles.clientStatusLabel}>SESIÓN DE CLIENTA ACTIVA</Text>
                                                <Text style={styles.clientStatusName}>
                                                    {clientName ? `Clienta: ${clientName}` : 'Sin clienta seleccionada (Modo de taller)'}
                                                    {sessionLabel ? ` · ${sessionLabel}` : ''}
                                                </Text>
                                            </View>
                                            <View style={styles.clientStatusPill}>
                                                <Text style={styles.clientStatusPillText}>
                                                    {activeMeasurementsMm ? `${Object.keys(activeMeasurementsMm).length} cotas tomadas` : '0 cotas'}
                                                </Text>
                                            </View>
                                        </View>

                                        {/* Lista de Medidas Obligatorias */}
                                        <Text style={styles.sectionHeaderTitle}>COTAS ANATÓMICAS OBLIGATORIAS PARA ESTA PRENDA</Text>
                                        <Text style={styles.sectionHeaderSubtitle}>
                                            El motor geométrico requiere estas medidas corporales para trazar la estructura sin deformación:
                                        </Text>

                                        <View style={styles.measureListContainer}>
                                            {inspectedPackage?.required.map((code, idx) => {
                                                const cat = MEASUREMENT_MAP[code];
                                                const name = cat?.name || code;
                                                const rawVal = activeMeasurementsMm ? activeMeasurementsMm[code] : undefined;
                                                const isRegistered = typeof rawVal === 'number' && Number.isFinite(rawVal) && rawVal > 0;
                                                const fallback = inspectedPackage.calculableFallbacks?.[code];
                                                const standardT40Val = HAUTE_COUTURE_STANDARD_SIZES[2].measures[code];

                                                return (
                                                    <View key={code} style={styles.measureItemRow}>
                                                        <View style={styles.measureItemLeft}>
                                                            <View style={styles.measureIndexBadge}>
                                                                <Text style={styles.measureIndexText}>{idx + 1}</Text>
                                                            </View>
                                                            <View style={styles.measureInfo}>
                                                                <Text style={styles.measureItemName}>{name}</Text>
                                                                <Text style={styles.measureItemCode}>
                                                                    Código: {code} · Rango biológico: {cat?.min_value_mm ? `${cat.min_value_mm / 10}-${cat.max_value_mm / 10} cm` : 'Taller'}
                                                                </Text>
                                                                {fallback && !isRegistered && (
                                                                    <Text style={styles.measureFallbackFormula}>
                                                                        ⚡ Proporción C10: {fallback.formulaDescription}
                                                                    </Text>
                                                                )}
                                                            </View>
                                                        </View>

                                                        <View style={styles.measureItemRight}>
                                                            {isRegistered ? (
                                                                <View style={styles.badgeReal}>
                                                                    <Text style={styles.badgeRealVal}>
                                                                        {(rawVal / 10).toFixed(1)} cm
                                                                    </Text>
                                                                    <Text style={styles.badgeRealLabel}>✓ REGISTRADA</Text>
                                                                </View>
                                                            ) : fallback ? (
                                                                <View style={styles.badgeCalculated}>
                                                                    <Text style={styles.badgeCalculatedVal}>
                                                                        {standardT40Val ? `~${(standardT40Val / 10).toFixed(1)} cm` : 'Auto C10'}
                                                                    </Text>
                                                                    <Text style={styles.badgeCalculatedLabel}>⚡ CÁLCULO C10</Text>
                                                                </View>
                                                            ) : standardT40Val ? (
                                                                <View style={styles.badgeStandard}>
                                                                    <Text style={styles.badgeStandardVal}>
                                                                        {(standardT40Val / 10).toFixed(1)} cm
                                                                    </Text>
                                                                    <Text style={styles.badgeStandardLabel}>📐 BASE T40</Text>
                                                                </View>
                                                            ) : (
                                                                <View style={styles.badgePending}>
                                                                    <Text style={styles.badgePendingLabel}>PENDIENTE</Text>
                                                                </View>
                                                            )}
                                                        </View>
                                                    </View>
                                                );
                                            })}
                                        </View>

                                        {/* Medidas Opcionales / Complementarias */}
                                        {inspectedPackage && inspectedPackage.optional.length > 0 && (
                                            <>
                                                <Text style={[styles.sectionHeaderTitle, { marginTop: 14 }]}>
                                                    MEDIDAS COMPLEMENTARIAS / AFINAMIENTO DE ALTA COSTURA
                                                </Text>
                                                <View style={styles.optionalTagsRow}>
                                                    {inspectedPackage.optional.map((code) => {
                                                        const cat = MEASUREMENT_MAP[code];
                                                        const name = cat?.name || code;
                                                        const rawVal = activeMeasurementsMm ? activeMeasurementsMm[code] : undefined;
                                                        const isPresent = typeof rawVal === 'number' && rawVal > 0;

                                                        return (
                                                            <View
                                                                key={code}
                                                                style={[
                                                                    styles.optionalTagPill,
                                                                    isPresent && styles.optionalTagPillPresent,
                                                                ]}
                                                            >
                                                                <Text
                                                                    style={[
                                                                        styles.optionalTagText,
                                                                        isPresent && styles.optionalTagTextPresent,
                                                                    ]}
                                                                >
                                                                    {isPresent ? '✓ ' : '+ '}{name}
                                                                    {isPresent ? ` (${(rawVal / 10).toFixed(1)} cm)` : ''}
                                                                </Text>
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            </>
                                        )}
                                    </ScrollView>
                                )}

                                {/* CONTENIDO: PESTAÑA 2 - TABLA DE TALLAS ESTÁNDAR */}
                                {activeDetailTab === 'size_table' && (
                                    <ScrollView style={styles.modalScrollArea} showsVerticalScrollIndicator>
                                        <Text style={styles.sectionHeaderTitle}>
                                            ESPECIFICACIÓN DE TALLAS DE ALTA COSTURA (SISTEMA FRANCÉS / INTERNACIONAL)
                                        </Text>
                                        <Text style={styles.sectionHeaderSubtitle}>
                                            Valores de referencia y graduación anatómica normalizada requeridos para confeccionar esta prenda:
                                        </Text>

                                        {/* Selector de Talla Activa para Inspección Detallada */}
                                        <View style={styles.sizeSelectorRow}>
                                            {HAUTE_COUTURE_STANDARD_SIZES.map((size) => {
                                                const isSizeSelected = selectedSizeCode === size.code;
                                                return (
                                                    <TouchableOpacity
                                                        key={size.code}
                                                        style={[
                                                            styles.sizeBtnPill,
                                                            isSizeSelected && styles.sizeBtnPillActive,
                                                            size.isWorkshopBase && styles.sizeBtnPillWorkshop,
                                                        ]}
                                                        onPress={() => setSelectedSizeCode(size.code)}
                                                        activeOpacity={0.8}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.sizeBtnPillText,
                                                                isSizeSelected && styles.sizeBtnPillTextActive,
                                                            ]}
                                                        >
                                                            {size.isWorkshopBase ? '★ ' : ''}{size.code}
                                                        </Text>
                                                        <Text
                                                            style={[
                                                                styles.sizeBtnPillSub,
                                                                isSizeSelected && styles.sizeBtnPillSubActive,
                                                            ]}
                                                        >
                                                            {size.label.split(' ')[1] || ''}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>

                                        {/* Tarjeta de Resumen de la Talla Seleccionada */}
                                        <View style={styles.selectedSizeCard}>
                                            <View style={styles.selectedSizeCardHeader}>
                                                <View>
                                                    <Text style={styles.selectedSizeCardTitle}>
                                                        {currentStandardSize.label} · {currentStandardSize.euroTag}
                                                    </Text>
                                                    <Text style={styles.selectedSizeCardDesc}>
                                                        {currentStandardSize.description}
                                                    </Text>
                                                </View>
                                                {currentStandardSize.isWorkshopBase && (
                                                    <View style={styles.workshopBaseBadge}>
                                                        <Text style={styles.workshopBaseBadgeText}>PATRÓN DE TALLER</Text>
                                                    </View>
                                                )}
                                            </View>

                                            <Text style={styles.sizeMeasuresTableTitle}>
                                                Cotas requeridas para {inspectedGarment?.name} en {currentStandardSize.code}:
                                            </Text>

                                            <View style={styles.sizeMeasuresGrid}>
                                                {inspectedPackage?.required.map((code) => {
                                                    const cat = MEASUREMENT_MAP[code];
                                                    const name = cat?.name || code;
                                                    const valMm = currentStandardSize.measures[code];

                                                    return (
                                                        <View key={code} style={styles.sizeMeasurePill}>
                                                            <Text style={styles.sizeMeasurePillLabel} numberOfLines={1}>
                                                                {name}
                                                            </Text>
                                                            <Text style={styles.sizeMeasurePillVal}>
                                                                {valMm ? `${(valMm / 10).toFixed(1)} cm` : 'Proporcional'}
                                                            </Text>
                                                            <Text style={styles.sizeMeasurePillMm}>
                                                                {valMm ? `(${valMm} mm)` : ''}
                                                            </Text>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </View>

                                        {/* Matriz Comparativa Completa de Todas las Tallas */}
                                        <Text style={[styles.sectionHeaderTitle, { marginTop: 14 }]}>
                                            MATRIZ COMPARATIVA DE GRADUACIÓN (T36 A T46)
                                        </Text>

                                        <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingVertical: 4 }}>
                                            <View style={styles.matrixTable}>
                                                {/* Fila de Encabezados */}
                                                <View style={styles.matrixHeaderRow}>
                                                    <Text style={[styles.matrixHeaderCell, styles.matrixFirstCol]}>Cota / Medida</Text>
                                                    {HAUTE_COUTURE_STANDARD_SIZES.map((s) => (
                                                        <Text
                                                            key={s.code}
                                                            style={[
                                                                styles.matrixHeaderCell,
                                                                styles.matrixDataCol,
                                                                s.isWorkshopBase && styles.matrixHeaderCellWorkshop,
                                                            ]}
                                                        >
                                                            {s.code}{s.isWorkshopBase ? ' ★' : ''}
                                                        </Text>
                                                    ))}
                                                </View>

                                                {/* Filas de Medidas Requeridas */}
                                                {inspectedPackage?.required.map((code, rIdx) => {
                                                    const cat = MEASUREMENT_MAP[code];
                                                    const name = cat?.name || code;
                                                    const isEven = rIdx % 2 === 0;

                                                    return (
                                                        <View
                                                            key={code}
                                                            style={[
                                                                styles.matrixDataRow,
                                                                isEven && styles.matrixDataRowEven,
                                                            ]}
                                                        >
                                                            <Text style={[styles.matrixDataCellName, styles.matrixFirstCol]} numberOfLines={1}>
                                                                {name}
                                                            </Text>
                                                            {HAUTE_COUTURE_STANDARD_SIZES.map((s) => {
                                                                const valMm = s.measures[code];
                                                                return (
                                                                    <Text
                                                                        key={s.code}
                                                                        style={[
                                                                            styles.matrixDataCellVal,
                                                                            styles.matrixDataCol,
                                                                            s.isWorkshopBase && styles.matrixDataCellWorkshop,
                                                                        ]}
                                                                    >
                                                                        {valMm ? `${(valMm / 10).toFixed(1)} cm` : '—'}
                                                                    </Text>
                                                                );
                                                            })}
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </ScrollView>
                                    </ScrollView>
                                )}
                            </View>
                        </View>

                        {/* Pie de Acciones del Modal */}
                        <View style={styles.modalFooter}>
                            <TouchableOpacity
                                style={styles.modalDismissBtn}
                                onPress={() => setInspectedGarment(null)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.modalDismissBtnText}>✕ Cerrar Vista</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.modalSelectBtn}
                                onPress={() => {
                                    if (inspectedGarment) {
                                        onSelectGarment(inspectedGarment.type as GarmentType);
                                        if (onProceedToCad) {
                                            onProceedToCad();
                                        }
                                        setInspectedGarment(null);
                                    }
                                }}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.modalSelectBtnText}>
                                    ✓ Seleccionar Prenda y Pasar a Mesa CAD →
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 24,
        marginBottom: 20,
        width: '100%',
        maxWidth: 960,
        alignSelf: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 4px 16px rgba(23, 20, 17, 0.05)',
            },
            default: {
                elevation: 2,
            },
        }),
    },
    headerRow: {
        marginBottom: 20,
        alignItems: 'center',
    },
    headerTitles: {
        alignItems: 'center',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 6,
    },
    stepBadge: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1.5,
        color: '#A78350',
        backgroundColor: 'rgba(167, 131, 80, 0.12)',
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#A78350',
        textTransform: 'uppercase',
    },
    stepSubtitle: {
        fontSize: 10.5,
        fontWeight: '700',
        letterSpacing: 1.2,
        color: '#8A8275',
    },
    mainTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#171411',
        fontFamily: Platform.OS === 'web' ? 'Playfair Display, Georgia, serif' : undefined,
        letterSpacing: 1,
        textAlign: 'center',
        marginTop: 4,
    },
    description: {
        fontSize: 13,
        color: '#766B62',
        marginTop: 6,
        textAlign: 'center',
        maxWidth: 680,
        lineHeight: 18,
    },
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
        justifyContent: 'center',
        width: '100%',
    },
    garmentCard: {
        width: '100%',
        backgroundColor: '#FCFAF6',
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#E8E0D2',
        padding: 14,
        justifyContent: 'space-between',
        ...Platform.select({
            web: {
                transition: 'all 0.2s ease',
                cursor: 'pointer',
            },
        }),
    },
    garmentCard3Col: {
        width: '31%',
        minWidth: 260,
        maxWidth: 295,
    },
    garmentCard2Col: {
        width: '48%',
        minWidth: 250,
        maxWidth: 420,
    },
    garmentCardSelected: {
        backgroundColor: '#FFFFFF',
        borderColor: '#A78350',
        borderWidth: 2,
        ...Platform.select({
            web: {
                boxShadow: '0 6px 20px rgba(167, 131, 80, 0.22)',
            },
        }),
    },
    garmentCardUpcoming: {
        opacity: 0.75,
        backgroundColor: '#F5F4F0',
        borderColor: '#DDD7CA',
    },
    cardTopBadgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    categoryText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#A78350',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    selectedBadge: {
        backgroundColor: 'rgba(167, 131, 80, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 2.5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#A78350',
    },
    selectedBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#A78350',
        letterSpacing: 0.8,
    },
    upcomingBadge: {
        backgroundColor: '#F2EDE2',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#DFD5C2',
    },
    upcomingBadgeText: {
        fontSize: 8,
        fontWeight: '700',
        color: '#8C7D65',
        letterSpacing: 0.5,
    },
    photoContainer: {
        width: '100%',
        height: 175,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#F3EFE6',
        marginBottom: 10,
        position: 'relative',
        borderWidth: 1,
        borderColor: '#E8E1D3',
    },
    photoContainerSelected: {
        borderColor: '#A78350',
        borderWidth: 2,
    },
    garmentPhoto: {
        width: '100%',
        height: '100%',
    },
    photoOverlayBadge: {
        position: 'absolute',
        bottom: 8,
        right: 8,
        backgroundColor: 'rgba(23, 20, 17, 0.78)',
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 4,
    },
    photoOverlayBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#F8F2E9',
        letterSpacing: 0.5,
    },
    photoZoomBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(23, 20, 17, 0.65)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.25)',
        paddingHorizontal: 8,
        paddingVertical: 3.5,
        borderRadius: 4,
        ...Platform.select({
            web: {
                cursor: 'pointer',
                backdropFilter: 'blur(4px)',
            },
        }),
    },
    photoZoomBadgeText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#F8F2E9',
        letterSpacing: 0.4,
    },
    garmentName: {
        fontSize: 14.5,
        fontWeight: '700',
        color: '#171411',
        fontFamily: Platform.OS === 'web' ? 'Playfair Display, Georgia, serif' : undefined,
        marginBottom: 4,
        letterSpacing: 0.3,
    },
    garmentNameSelected: {
        color: '#A78350',
    },
    garmentDesc: {
        fontSize: 11,
        color: '#766B62',
        lineHeight: 15,
        marginBottom: 10,
        minHeight: 30,
    },
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: '#EFE7DA',
        paddingTop: 8,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    footerItem: {
        flex: 1,
        paddingRight: 4,
    },
    footerLabel: {
        fontSize: 9,
        color: '#8C8275',
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    footerVal: {
        fontSize: 9.5,
        color: '#423D35',
        fontWeight: '600',
    },
    footerItemRight: {},
    piecesPill: {
        fontSize: 9,
        fontWeight: '700',
        color: '#8A6A4A',
        backgroundColor: '#FAF5EA',
        borderWidth: 1,
        borderColor: '#E8DEC9',
        paddingHorizontal: 7,
        paddingVertical: 2.5,
        borderRadius: 4,
    },
    cardActionRow: {
        flexDirection: 'row',
        gap: 6,
    },
    inspectActionBtn: {
        flex: 1,
        backgroundColor: '#FAF7F2',
        paddingVertical: 7,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                transition: 'all 0.18s ease',
                cursor: 'pointer',
            },
        }),
    },
    inspectActionBtnText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8A6A4A',
        letterSpacing: 0.4,
    },
    selectActionBtn: {
        flex: 1.2,
        backgroundColor: '#A78350',
        paddingVertical: 7,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#A78350',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                transition: 'all 0.18s ease',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(167, 131, 80, 0.25)',
            },
        }),
    },
    selectActionBtnSelected: {
        backgroundColor: '#171411',
        borderWidth: 1,
        borderColor: '#D4AF37',
        ...Platform.select({
            web: {
                boxShadow: '0 2px 8px rgba(23, 20, 17, 0.3)',
            },
        }),
    },
    selectActionBtnUpcoming: {
        backgroundColor: '#DDD8CB',
    },
    selectActionBtnText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#FFFFFF',
    },
    selectActionBtnTextSelected: {
        color: '#DFC293',
    },
    proceedBanner: {
        marginTop: 18,
        padding: 16,
        backgroundColor: '#FAF7F0',
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: '#C5A059',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 12,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 14px rgba(197, 160, 89, 0.15)',
            },
        }),
    },
    proceedInfoCol: {
        flex: 1,
        minWidth: 220,
    },
    proceedBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    proceedStepBadge: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
        color: '#A78350',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E7D9B8',
    },
    proceedPreLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: '#8A8275',
        letterSpacing: 0.8,
    },
    proceedTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F1E1C',
        marginBottom: 2,
    },
    proceedMeta: {
        fontSize: 11,
        color: '#6E665A',
    },
    proceedBtn: {
        backgroundColor: '#C5A059',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 3px 8px rgba(197, 160, 89, 0.28)',
                cursor: 'pointer',
            },
        }),
    },
    proceedBtnText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#FFFFFF',
    },

    // ==============================================================================
    // ESTILOS DEL MODAL DE AMPLIACIÓN Y DESGLOSE DE TALLAS
    // ==============================================================================
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(20, 18, 16, 0.78)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },
    modalBox: {
        width: '100%',
        maxWidth: 960,
        maxHeight: '92%',
        backgroundColor: '#FFFEFC',
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: '#C5A059',
        overflow: 'hidden',
        flexDirection: 'column',
        ...Platform.select({
            web: {
                boxShadow: '0 16px 48px rgba(20, 18, 16, 0.35)',
            },
            default: {
                elevation: 10,
            },
        }),
    },
    modalBoxWide: {
        maxHeight: 700,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EDE5D6',
        backgroundColor: '#FAF7F0',
    },
    modalHeaderLeft: {
        flex: 1,
        paddingRight: 12,
    },
    modalTopBadgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    modalSuperBadge: {
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1.2,
        color: '#A78350',
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 7,
        paddingVertical: 2,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#E6D9B8',
    },
    modalCategoryBadge: {
        fontSize: 9,
        fontWeight: '700',
        color: '#7D7364',
        textTransform: 'uppercase',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A1816',
        letterSpacing: 0.6,
    },
    modalSubtitle: {
        fontSize: 11.5,
        color: '#7A7061',
        marginTop: 2,
    },
    modalCloseBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#EFE7D8',
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    modalCloseBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#5C5446',
    },
    modalBodyRow: {
        flex: 1,
        minHeight: 380,
    },
    modalBodyWide: {
        flexDirection: 'row',
    },
    modalBodyColumn: {
        flexDirection: 'column',
    },
    modalLeftColumn: {
        padding: 16,
        borderRightWidth: 1,
        borderRightColor: '#EDE5D6',
        backgroundColor: '#FAF9F5',
    },
    modalLeftColumnWide: {
        width: 380,
        justifyContent: 'space-between',
    },
    largeImageFrame: {
        width: '100%',
        height: 380,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#C5A059',
        backgroundColor: '#1E1D1B',
        position: 'relative',
        ...Platform.select({
            web: {
                boxShadow: '0 8px 24px rgba(36, 32, 28, 0.22)',
            },
        }),
    },
    largeGarmentImage: {
        width: '100%',
        height: '100%',
    },
    largeImageOverlay: {
        position: 'absolute',
        bottom: 10,
        right: 10,
        backgroundColor: 'rgba(18, 16, 14, 0.85)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#C5A059',
    },
    largeImageOverlayText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
        color: '#F4ECE0',
    },
    garmentSpecBox: {
        marginTop: 12,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6DCC8',
        padding: 10,
    },
    garmentSpecTitle: {
        fontSize: 11,
        fontWeight: '800',
        color: '#423B30',
        letterSpacing: 0.6,
        textTransform: 'uppercase',
        marginBottom: 3,
    },
    garmentSpecDesc: {
        fontSize: 11,
        color: '#6B6254',
        lineHeight: 15,
    },
    garmentSpecMethod: {
        fontSize: 9.5,
        color: '#8C774D',
        marginTop: 6,
        fontStyle: 'italic',
    },
    modalRightColumn: {
        flex: 1,
        padding: 16,
        backgroundColor: '#FFFFFF',
        flexDirection: 'column',
    },
    modalRightColumnWide: {
        flex: 1,
    },
    modalTabRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EBE2D3',
        paddingBottom: 8,
    },
    modalTabBtn: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 6,
        backgroundColor: '#F5EFE4',
        borderWidth: 1,
        borderColor: '#DFD3BC',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    modalTabBtnActive: {
        backgroundColor: '#C5A059',
        borderColor: '#B38E46',
    },
    modalTabBtnText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#6E624E',
    },
    modalTabBtnTextActive: {
        color: '#FFFFFF',
    },
    modalScrollArea: {
        flex: 1,
    },
    clientStatusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FBF8F2',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#EAE0CE',
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginBottom: 12,
    },
    clientStatusLabel: {
        fontSize: 8.5,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#9C7A40',
        textTransform: 'uppercase',
    },
    clientStatusName: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#262421',
        marginTop: 1,
    },
    clientStatusPill: {
        backgroundColor: '#EDE3D1',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 5,
    },
    clientStatusPillText: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#695D4A',
    },
    sectionHeaderTitle: {
        fontSize: 10.5,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#36322A',
        marginBottom: 2,
    },
    sectionHeaderSubtitle: {
        fontSize: 10,
        color: '#7D7364',
        marginBottom: 10,
        lineHeight: 14,
    },
    measureListContainer: {
        gap: 6,
    },
    measureItemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 7,
        paddingHorizontal: 10,
        backgroundColor: '#FAFAF7',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#ECE4D4',
    },
    measureItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        paddingRight: 8,
    },
    measureIndexBadge: {
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#EBE2D0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    measureIndexText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#665B47',
    },
    measureInfo: {
        flex: 1,
    },
    measureItemName: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#22201D',
    },
    measureItemCode: {
        fontSize: 9,
        color: '#827869',
        marginTop: 1,
    },
    measureFallbackFormula: {
        fontSize: 9,
        color: '#436B95',
        marginTop: 2,
        fontWeight: '600',
    },
    measureItemRight: {
        alignItems: 'flex-end',
    },
    badgeReal: {
        alignItems: 'flex-end',
    },
    badgeRealVal: {
        fontSize: 12,
        fontWeight: '800',
        color: '#1C6B37',
    },
    badgeRealLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: '#1C6B37',
        letterSpacing: 0.5,
    },
    badgeCalculated: {
        alignItems: 'flex-end',
    },
    badgeCalculatedVal: {
        fontSize: 11,
        fontWeight: '700',
        color: '#245E8F',
    },
    badgeCalculatedLabel: {
        fontSize: 7.5,
        fontWeight: '800',
        color: '#245E8F',
        letterSpacing: 0.5,
    },
    badgeStandard: {
        alignItems: 'flex-end',
    },
    badgeStandardVal: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8A6828',
    },
    badgeStandardLabel: {
        fontSize: 7.5,
        fontWeight: '800',
        color: '#8A6828',
        letterSpacing: 0.5,
    },
    badgePending: {
        backgroundColor: '#FDECEB',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    badgePendingLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: '#A9261E',
    },
    optionalTagsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginTop: 4,
    },
    optionalTagPill: {
        backgroundColor: '#F5F2EA',
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#E6DCC8',
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    optionalTagPillPresent: {
        backgroundColor: '#EAF5EE',
        borderColor: '#BFE3CC',
    },
    optionalTagText: {
        fontSize: 10,
        color: '#706655',
        fontWeight: '600',
    },
    optionalTagTextPresent: {
        color: '#1F6B38',
        fontWeight: '700',
    },

    // Estilos de la Pestaña de Tallas Estándar
    sizeSelectorRow: {
        flexDirection: 'row',
        gap: 6,
        flexWrap: 'wrap',
        marginBottom: 12,
    },
    sizeBtnPill: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 6,
        backgroundColor: '#F5EFE4',
        borderWidth: 1,
        borderColor: '#DFD3BC',
        alignItems: 'center',
        minWidth: 54,
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    sizeBtnPillActive: {
        backgroundColor: '#C5A059',
        borderColor: '#B38E46',
    },
    sizeBtnPillWorkshop: {
        borderWidth: 1.5,
        borderColor: '#C5A059',
    },
    sizeBtnPillText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#4A4234',
    },
    sizeBtnPillTextActive: {
        color: '#FFFFFF',
    },
    sizeBtnPillSub: {
        fontSize: 8.5,
        fontWeight: '600',
        color: '#8C7F6C',
    },
    sizeBtnPillSubActive: {
        color: '#FAF4EB',
    },
    selectedSizeCard: {
        backgroundColor: '#FAF7F0',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6DCC8',
        padding: 12,
        marginBottom: 14,
    },
    selectedSizeCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        borderBottomWidth: 1,
        borderBottomColor: '#EBE1D0',
        paddingBottom: 8,
        marginBottom: 10,
    },
    selectedSizeCardTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#2A261F',
    },
    selectedSizeCardDesc: {
        fontSize: 10.5,
        color: '#7A6F5E',
        marginTop: 2,
    },
    workshopBaseBadge: {
        backgroundColor: '#C5A059',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    workshopBaseBadgeText: {
        fontSize: 8.5,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.8,
    },
    sizeMeasuresTableTitle: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#5C5243',
        marginBottom: 8,
    },
    sizeMeasuresGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    sizeMeasurePill: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#E2D7C2',
        paddingHorizontal: 10,
        paddingVertical: 6,
        minWidth: 120,
    },
    sizeMeasurePillLabel: {
        fontSize: 9.5,
        color: '#8A7D6B',
        fontWeight: '600',
    },
    sizeMeasurePillVal: {
        fontSize: 12,
        fontWeight: '800',
        color: '#262421',
        marginTop: 2,
    },
    sizeMeasurePillMm: {
        fontSize: 8.5,
        color: '#9C907E',
    },
    matrixTable: {
        borderWidth: 1,
        borderColor: '#E0D6C2',
        borderRadius: 6,
        overflow: 'hidden',
        minWidth: 520,
    },
    matrixHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#EFE7D8',
        borderBottomWidth: 1,
        borderBottomColor: '#DFD3BC',
    },
    matrixHeaderCell: {
        paddingHorizontal: 8,
        paddingVertical: 7,
        fontSize: 9.5,
        fontWeight: '800',
        color: '#473E31',
        textAlign: 'center',
    },
    matrixHeaderCellWorkshop: {
        backgroundColor: '#E4D5BE',
        color: '#7D5C1E',
    },
    matrixFirstCol: {
        width: 170,
        textAlign: 'left',
    },
    matrixDataCol: {
        width: 65,
    },
    matrixDataRow: {
        flexDirection: 'row',
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#F0E9DC',
    },
    matrixDataRowEven: {
        backgroundColor: '#FAF9F5',
    },
    matrixDataCellName: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 10,
        fontWeight: '600',
        color: '#36322A',
    },
    matrixDataCellVal: {
        paddingHorizontal: 8,
        paddingVertical: 6,
        fontSize: 9.5,
        fontWeight: '700',
        color: '#474034',
        textAlign: 'center',
    },
    matrixDataCellWorkshop: {
        backgroundColor: 'rgba(197, 160, 89, 0.12)',
        fontWeight: '800',
        color: '#785718',
    },

    // Pie de Acciones del Modal
    modalFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderTopWidth: 1,
        borderTopColor: '#EDE5D6',
        backgroundColor: '#FAF7F0',
        gap: 12,
    },
    modalDismissBtn: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: '#EBE3D3',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    modalDismissBtnText: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#665B47',
    },
    modalSelectBtn: {
        flex: 1,
        maxWidth: 380,
        backgroundColor: '#C5A059',
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        ...Platform.select({
            web: {
                boxShadow: '0 3px 8px rgba(197, 160, 89, 0.28)',
                cursor: 'pointer',
            },
        }),
    },
    modalSelectBtnText: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#FFFFFF',
    },
});
