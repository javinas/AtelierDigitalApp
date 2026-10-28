// ==============================================================================
// ATELIER DIGITAL — MODAL: DOSSIER TÉCNICO DE PRODUCCIÓN & TALLER C13
// Archivo: src/components/pattern/ProductionDossierModal.tsx
// ==============================================================================
// Dossier editorial de alta costura: Ficha Técnica Editorial, Plano de Corte 1:1
// con visor CAD interactivo y Paquete de Entregables Industriales.
// Certificación de taller por Katherine Carroll y gating de seguridad para corte.
// ==============================================================================

import React, { useMemo, useState } from 'react';
import {
    Alert,
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
import { exportPatternToDxf } from '../../engine/pattern/export/dxfExporter';
import { generateTiledPrintHtml } from '../../engine/pattern/export/pdfTiledExporter';
import { exportPatternToSvg } from '../../engine/pattern/export/svgExporter';
import { pathToSvgD, roundTo } from '../../engine/pattern/geometry/geometry2d';
import { PatternPiece } from '../../engine/pattern/geometry/types';
import {
    buildProductionSheetData,
    generateProductionSheetHtml,
    ProductionSheetData,
} from '../../services/productionSheetService';
import { colors } from '../../theme/colors';
import { Client } from '../../types/client';
import { MeasurementSession } from '../../types/pattern/measurement';
import {
    PatternAdjustment,
    PatternExecution,
    PatternTemplate,
} from '../../types/pattern/pattern';
import { GARMENT_IMAGES } from './GarmentSelectionGrid';
import { PatternPreviewCanvas } from './PatternPreviewCanvas';

interface ProductionDossierModalProps {
    visible: boolean;
    execution: PatternExecution | null;
    client: Client | null;
    session: MeasurementSession | null;
    template: PatternTemplate | null;
    executionHistory?: PatternExecution[];
    adjustmentsHistory?: PatternAdjustment[];
    onClose: () => void;
    onStatusMessage?: (msg: { text: string; type: 'success' | 'error' | 'info' }) => void;
}

// Sugerencias técnicas textiles y de avíos por arquetipo de prenda
const GARMENT_CONFECTION_PRESETS: Record<string, {
    suggestedFabric: string;
    lining: string;
    interfacing: string;
    notions: string[];
}> = {
    skirt: {
        suggestedFabric: 'Crepé de lana sastre / Tafetán de seda / Seda mikado',
        lining: 'Forro de cupro o seda habotai transpirable',
        interfacing: 'Entretela termoadhesiva sastre para pretina',
        notions: ['Cremallera invisible sastre de 20 cm', 'Corchete metálico de cintura', 'Hilo de seda para dobladillo a mano'],
    },
    bodice: {
        suggestedFabric: 'Faya de seda / Raso duquesa / Crepé marroquí',
        lining: 'Batista de algodón fina / Forro de seda ligero',
        interfacing: 'Entretela de trama ligera para vistas de escote',
        notions: ['Cremallera separable o botones forrados a mano', 'Entretela de sisa'],
    },
    pants: {
        suggestedFabric: 'Lana fría sastre (Super 120s) / Lino con caída / Crepé de lana',
        lining: 'Forro de media pierna delantero en cupro antiestático',
        interfacing: 'Entretela tejida pretina reforzada',
        notions: ['Cremallera sastre de latón de 18 cm', 'Botón de asta natural', 'Corchete sastre de cintura', 'Cinta pretina sastre'],
    },
    dress: {
        suggestedFabric: 'Seda crepé Georgette / Mikado de seda / Raso de seda natural',
        lining: 'Forro integral en gasa o cupro de alta costura',
        interfacing: 'Entretela de escote y sisas con cinta al bies de refuerzo',
        notions: ['Cremallera invisible de 50 cm en espalda', 'Corchete de seguridad', 'Hilo torzal para remates de taller'],
    },
    sleeve: {
        suggestedFabric: 'Tejido coincidente con cuerpo principal de la prenda',
        lining: 'Forro de manga en cupro liso con sangría de codo',
        interfacing: 'Pliegue de embebido sastre y bozo de copa en guata ligera',
        notions: ['Hombrera sastre anatómica de 10-12 mm', 'Plisadillo de copa'],
    },
    blouse: {
        suggestedFabric: 'Chiffon de seda / Georgette / Popelín de algodón egipcio',
        lining: 'Sin forro o forro ligero al tono en pechera',
        interfacing: 'Entretela no tejida ultrasuave para cuello y puños',
        notions: ['Botones de nácar natural de 10 mm (8 unidades)', 'Presillas de cordoncillo hechas a mano'],
    },
    shirt: {
        suggestedFabric: 'Popelín de algodón 100/2 / Sarga de seda / Voile suizo',
        lining: 'Cuello y puños reforzados con entretela sastre',
        interfacing: 'Entretela tejida especial camisería con fusión suave',
        notions: ['Botones de nácar de 11 mm (10 unidades)', 'Ballenas de cuello de latón o nácar'],
    },
    corset: {
        suggestedFabric: 'Coutil inglés de espiga / Raso de seda / Brocado de alta costura',
        lining: 'Forro 100% algodón sarga de soporte estructural',
        interfacing: 'Coutil interior reforzado sin termoadhesivo',
        notions: ['Ballenas de acero espiralado de 6 mm', 'Busco delantero de acero inoxidable', 'Ojetes metálicos n° 0', 'Cordón sastre de algodón'],
    },
    jacket: {
        suggestedFabric: 'Lana virgen peinada / Tweed boucle / Raso sastre',
        lining: 'Forro completo en cupro de Bemberg o sarga de seda',
        interfacing: 'Plastrón sastre de crin de caballo (canavazo) picado a mano',
        notions: ['Hombreras sastre de fieltro y guata', 'Botones de cuerno natural (3 grandes, 6 manga)', 'Fieltro bajo cuello'],
    },
    coat: {
        suggestedFabric: 'Cachemira pura / Paño de lana alpaca / Melton sastre pesado',
        lining: 'Forro de satén de seda acolchado o cupro pesado',
        interfacing: 'Plastrón completo de crin y entretela de hombros y solapas',
        notions: ['Botones de asta de 28 mm (4 unidades)', 'Hombreras sastre reforzadas', 'Cinta de aplomo de bajo en cadeneta'],
    },
};

export function ProductionDossierModal({
    visible,
    execution,
    client,
    session,
    template,
    executionHistory = [],
    adjustmentsHistory = [],
    onClose,
    onStatusMessage,
}: ProductionDossierModalProps) {
    const { width: windowWidth } = useWindowDimensions();
    const isDesktopWide = windowWidth >= 840;

    const [activeTab, setActiveTab] = useState<'sheet' | 'layout' | 'exports'>('sheet');
    const [showFullPiecesTable, setShowFullPiecesTable] = useState<boolean>(false);

    // Construir datos estructurados de la Ficha Técnica de forma pura y reactiva
    const sheetData: ProductionSheetData | null = useMemo(() => {
        if (!execution || !client) return null;
        return buildProductionSheetData({
            execution,
            client,
            session,
            template,
            history: executionHistory,
            adjustments: adjustmentsHistory,
        });
    }, [execution, client, session, template, executionHistory, adjustmentsHistory]);

    if (!execution || !sheetData) {
        return null;
    }

    const isApproved = sheetData.isApprovedForCutting;
    const pieces = execution.geometry_result.pieces || [];

    // Separar piezas del Delantero y Espalda para mini-bocetos técnicos vectoriales
    const frontPieces = pieces.filter((p) => {
        const txt = `${p.name} ${p.code} ${p.id}`.toLowerCase();
        return txt.includes('delantero') || txt.includes('del') || txt.includes('front');
    });

    const backPieces = pieces.filter((p) => {
        const txt = `${p.name} ${p.code} ${p.id}`.toLowerCase();
        return txt.includes('espalda') || txt.includes('esp') || txt.includes('back') || txt.includes('posterior');
    });

    const confectionPreset = GARMENT_CONFECTION_PRESETS[execution.garment_type] || {
        suggestedFabric: 'Tejido noble de alta costura a seleccionar',
        lining: 'Forro transpirable de alta costura',
        interfacing: 'Entretela estructurada según peso del tejido',
        notions: ['Avíos sastre estándar de taller'],
    };

    // Manejador: Imprimir Ficha Técnica de Taller (Hoja suelta)
    const handlePrintSpecificationSheet = () => {
        const html = generateProductionSheetHtml(sheetData);
        if (Platform.OS === 'web') {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
            }
        } else {
            Alert.alert('Ficha Técnica', 'Documento de especificación generado para impresión.');
        }
    };

    // Manejador: Imprimir Mosaico 1:1 con Ficha Técnica en Portada (Hoja 1)
    const handlePrintTiledWithCover = () => {
        const coverHtml = generateProductionSheetHtml(sheetData);
        const bodyContent = coverHtml.substring(
            coverHtml.indexOf('<body>') + 6,
            coverHtml.lastIndexOf('</body>')
        );

        const fullHtml = generateTiledPrintHtml(execution.geometry_result, {
            title: `Patrón ${sheetData.garmentName}`,
            clientName: sheetData.client.fullName,
            paperSize: 'a4',
            status: execution.status,
            versionLabel: execution.version_label,
            productionCoverHtml: bodyContent,
        });

        if (Platform.OS === 'web') {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(fullHtml);
                printWindow.document.close();
            }
        } else {
            Alert.alert('Mosaico de Taller', 'Mosaico 1:1 con Ficha Técnica generado.');
        }
    };

    // Manejador: Descarga SVG a escala física 1:1 con metadatos y sellos
    const handleExportCertifiedSvg = () => {
        const svgContent = exportPatternToSvg(execution.geometry_result, {
            title: `Patrón ${sheetData.garmentName} — ${sheetData.client.fullName}`,
            status: execution.status,
            clientName: sheetData.client.fullName,
            versionLabel: execution.version_label,
            templateName: sheetData.garmentName,
        });

        if (Platform.OS === 'web') {
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const prefix = isApproved ? 'CERTIFICADO' : 'BORRADOR';
            a.download = `${prefix}_${execution.garment_type}_${sheetData.client.fullName.replace(/\s+/g, '_')}_1a1.svg`;
            a.click();
            URL.revokeObjectURL(url);
            if (onStatusMessage) {
                onStatusMessage({
                    text: `Archivo SVG ${isApproved ? 'Certificado' : 'Borrador'} a escala física 1:1 descargado.`,
                    type: 'info',
                });
            }
        } else {
            Alert.alert('SVG Generado', 'Archivo SVG a escala real listo.');
        }
    };

    // Manejador: Descarga CAD DXF (R12)
    const handleExportCertifiedDxf = () => {
        const dxfContent = exportPatternToDxf(
            execution.geometry_result,
            `Atelier Digital - ${sheetData.garmentName} - ${sheetData.client.fullName}`
        );

        if (Platform.OS === 'web') {
            const blob = new Blob([dxfContent], { type: 'application/dxf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const prefix = isApproved ? 'CERTIFICADO' : 'BORRADOR';
            a.download = `${prefix}_${execution.garment_type}_${sheetData.client.fullName.replace(/\s+/g, '_')}.dxf`;
            a.click();
            URL.revokeObjectURL(url);
            if (onStatusMessage) {
                onStatusMessage({
                    text: `Archivo CAD DXF (R12) ${isApproved ? 'Certificado' : 'Borrador'} descargado.`,
                    type: 'info',
                });
            }
        } else {
            Alert.alert('DXF Generado', 'Archivo CAD DXF industrial listo.');
        }
    };

    // Renderizar mini-trazado vectorial CAD de un grupo de piezas
    const renderCadMiniSketch = (groupPieces: PatternPiece[], label: string) => {
        if (groupPieces.length === 0) return null;

        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of groupPieces) {
            minX = Math.min(minX, p.boundingBox.minX);
            minY = Math.min(minY, p.boundingBox.minY);
            maxX = Math.max(maxX, p.boundingBox.maxX);
            maxY = Math.max(maxY, p.boundingBox.maxY);
        }
        const pad = 20;
        const w = Math.max(maxX - minX + pad * 2, 100);
        const h = Math.max(maxY - minY + pad * 2, 100);
        const vx = minX - pad;
        const vy = minY - pad;

        return (
            <View style={styles.cadSketchCard}>
                <View style={styles.cadSketchBadgeRow}>
                    <Text style={styles.cadSketchBadgeLabel}>{label.toUpperCase()}</Text>
                    <Text style={styles.cadSketchBadgeCount}>
                        {groupPieces.length} {groupPieces.length === 1 ? 'pieza' : 'piezas'}
                    </Text>
                </View>

                <View style={styles.cadSketchSvgBox}>
                    {Platform.OS === 'web' ? (
                        <svg
                            width="100%"
                            height="100%"
                            viewBox={`${vx} ${vy} ${w} ${h}`}
                            preserveAspectRatio="xMidYMid meet"
                            style={{ width: '100%', height: '100%', display: 'block' }}
                        >
                            {groupPieces.map((p) => (
                                <g key={p.id}>
                                    <path
                                        d={pathToSvgD(p.outlineCut)}
                                        fill="#FFFDF9"
                                        stroke="#171411"
                                        strokeWidth="1.8"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    {p.outlineSeam && (
                                        <path
                                            d={pathToSvgD(p.outlineSeam)}
                                            fill="none"
                                            stroke="#A78350"
                                            strokeWidth="1.0"
                                            strokeDasharray="4 3"
                                        />
                                    )}
                                </g>
                            ))}
                        </svg>
                    ) : (
                        <View style={styles.cadSketchFallback}>
                            <Text style={styles.cadSketchFallbackText}>Trazado CAD {label}</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.cadSketchDimText}>
                    {Math.round(w - pad * 2)} × {Math.round(h - pad * 2)} mm
                </Text>
            </View>
        );
    };

    return (
        <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
            <View style={styles.container}>
                {/* Cabecera Editorial del Dossier */}
                <View style={[styles.modalHeader, activeTab === 'layout' && styles.modalHeaderCompact]}>
                    <View style={styles.modalHeaderTitles}>
                        <Text style={styles.superTitle}>ATELIER DIGITAL · BY KATHERINE CARROLL</Text>
                        <Text style={[styles.mainTitle, activeTab === 'layout' && styles.mainTitleCompact]}>
                            DOSSIER TÉCNICO DE PRODUCCIÓN & TALLER (C13)
                        </Text>
                        {activeTab !== 'layout' && (
                            <Text style={styles.modalSubtitle}>
                                Ficha Técnica Editorial, Planificación de Corte y Paquete Industrial de Exportación
                            </Text>
                        )}
                    </View>
                    <TouchableOpacity style={styles.closeBtn} onPress={onClose} activeOpacity={0.8}>
                        <Text style={styles.closeBtnText}>✕ Cerrar Dossier</Text>
                    </TouchableOpacity>
                </View>

                {/* Banner de Certificación de Taller & Gating de Seguridad */}
                <View
                    style={[
                        styles.gatingBanner,
                        isApproved ? styles.gatingBannerApproved : styles.gatingBannerDraft,
                        activeTab === 'layout' && styles.gatingBannerCompact,
                    ]}
                >
                    <View style={[styles.gatingIconBox, isApproved ? styles.gatingIconBoxApproved : styles.gatingIconBoxDraft, activeTab === 'layout' && styles.gatingIconBoxCompact]}>
                        <Text style={[styles.gatingIcon, activeTab === 'layout' && { fontSize: 11 }]}>{isApproved ? '✓' : '⏳'}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text
                            style={[
                                styles.gatingTitle,
                                isApproved ? styles.gatingTitleApproved : styles.gatingTitleDraft,
                                activeTab === 'layout' && { fontSize: 10.5 },
                            ]}
                        >
                            {isApproved
                                ? '✓ CERTIFICACIÓN DE ALTA COSTURA — APROBADO PARA CORTE EN TALLER'
                                : '⏳ BORRADOR TÉCNICO EN PROCESO DE PRUEBA (FITTING) — PENDIENTE DE APROBACIÓN'}
                        </Text>
                        {activeTab !== 'layout' && (
                            <Text style={styles.gatingSub}>
                                {isApproved
                                    ? `Validación geométrica estricta y prueba de vestuario conforme. Certificado por Katherine Carroll el ${sheetData.approvalDate || 'Fecha registrada'}.`
                                    : 'Este patrón no ha completado la aprobación formal de Katherine Carroll. Válido exclusivamente para pruebas en muselina (toile); prohibido para corte definitivo.'}
                            </Text>
                        )}
                    </View>
                </View>

                {/* Barra de Pestañas de Navegación del Dossier */}
                <View style={styles.tabsRow}>
                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'sheet' && styles.tabBtnActive, activeTab === 'layout' && styles.tabBtnCompact]}
                        onPress={() => setActiveTab('sheet')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabText, activeTab === 'sheet' && styles.tabTextActive]}>
                            📋 1. Ficha Técnica
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'layout' && styles.tabBtnActive, activeTab === 'layout' && styles.tabBtnCompact]}
                        onPress={() => setActiveTab('layout')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabText, activeTab === 'layout' && styles.tabTextActive]}>
                            📐 2. Plano de Corte
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.tabBtn, activeTab === 'exports' && styles.tabBtnActive, activeTab === 'layout' && styles.tabBtnCompact]}
                        onPress={() => setActiveTab('exports')}
                        activeOpacity={0.8}
                    >
                        <Text style={[styles.tabText, activeTab === 'exports' && styles.tabTextActive]}>
                            📦 3. Entregables & CAD
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* ============================================================================== */}
                {/* CONTENIDO: PESTAÑA 1 - FICHA TÉCNICA EDITORIAL DE ALTA COSTURA */}
                {/* ============================================================================== */}
                {activeTab === 'sheet' && (
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
                        {/* A. ENCABEZADO VISUAL DE LA PRENDA: FOTOGRAFÍA + DIBUJOS CAD REALES */}
                        <View style={styles.editorialHeaderCard}>
                            <View style={styles.editorialHeaderRow}>
                                {/* Fotografía Editorial de Inspiración */}
                                <View style={styles.editorialPhotoContainer}>
                                    <View style={styles.editorialPhotoBadge}>
                                        <Text style={styles.editorialPhotoBadgeText}>📷 REFERENCIA DE INSPIRACIÓN</Text>
                                    </View>
                                    {GARMENT_IMAGES[execution.garment_type] && (
                                        <Image
                                            source={GARMENT_IMAGES[execution.garment_type]}
                                            style={styles.editorialPhoto as any}
                                            resizeMode="cover"
                                        />
                                    )}
                                    <Text style={styles.editorialPhotoCaption}>Silueta de Colección Atelier</Text>
                                </View>

                                {/* Información Maestro de la Prenda y Clienta */}
                                <View style={styles.editorialInfoColumn}>
                                    <View style={styles.editorialGoldRule} />
                                    <Text style={styles.editorialGarmentTitle}>{sheetData.garmentName}</Text>
                                    <Text style={styles.editorialClientName}>
                                        Clienta: <Text style={styles.editorialClientHighlight}>{sheetData.client.fullName}</Text>
                                    </Text>

                                    <View style={styles.editorialMetaGrid}>
                                        <View style={styles.editorialMetaItem}>
                                            <Text style={styles.editorialMetaLabel}>REFERENCIA:</Text>
                                            <Text style={styles.editorialMetaVal}>
                                                PAT-{execution.garment_type.toUpperCase().substring(0, 3)}-{execution.id.substring(0, 6).toUpperCase()}
                                            </Text>
                                        </View>
                                        <View style={styles.editorialMetaItem}>
                                            <Text style={styles.editorialMetaLabel}>VERSIÓN:</Text>
                                            <Text style={styles.editorialMetaVal}>{sheetData.lineage.currentVersion}</Text>
                                        </View>
                                        <View style={styles.editorialMetaItem}>
                                            <Text style={styles.editorialMetaLabel}>MÉTODO PATRONAL:</Text>
                                            <Text style={styles.editorialMetaVal}>{sheetData.lineage.methodReference}</Text>
                                        </View>
                                        <View style={styles.editorialMetaItem}>
                                            <Text style={styles.editorialMetaLabel}>ESTADO:</Text>
                                            <Text style={[styles.editorialMetaVal, isApproved ? styles.valApproved : styles.valDraft]}>
                                                {isApproved ? 'Aprobado para Corte' : 'En Prueba / Fitting'}
                                            </Text>
                                        </View>
                                        <View style={styles.editorialMetaItem}>
                                            <Text style={styles.editorialMetaLabel}>FECHA:</Text>
                                            <Text style={styles.editorialMetaVal}>
                                                {sheetData.approvalDate || sheetData.createdAt.substring(0, 10)}
                                            </Text>
                                        </View>
                                        <View style={styles.editorialMetaItem}>
                                            <Text style={styles.editorialMetaLabel}>RESPONSABLE:</Text>
                                            <Text style={styles.editorialMetaVal}>
                                                {sheetData.approverLabel || 'Katherine Carroll (Directora)'}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Botón de Impresión de la Ficha Sola */}
                                    <TouchableOpacity
                                        style={styles.editorialPrintBtn}
                                        onPress={handlePrintSpecificationSheet}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.editorialPrintBtnText}>🖨 Imprimir Ficha Técnica de Taller (A4)</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>

                            {/* Dibujos Técnicos Reales del Delantero y Espalda (CAD Vectorial 1:1) */}
                            <View style={styles.cadSketchesSection}>
                                <View style={styles.cadSketchesHeader}>
                                    <Text style={styles.cadSketchesTitle}>
                                        📐 TRAZADO CAD VERIFICADO PARA CONFECCIÓN (PIEZAS REALES)
                                    </Text>
                                    <Text style={styles.cadSketchesSubtitle}>
                                        Geometría paramétrica derivada de las cotas corporales de la clienta
                                    </Text>
                                </View>

                                <View style={styles.cadSketchesRow}>
                                    {renderCadMiniSketch(frontPieces, 'Delantero')}
                                    {renderCadMiniSketch(backPieces, 'Espalda')}
                                    {pieces.length > frontPieces.length + backPieces.length && (
                                        <View style={styles.cadOtherPiecesNotice}>
                                            <Text style={styles.cadOtherPiecesTitle}>
                                                +{pieces.length - (frontPieces.length + backPieces.length)} Piezas Complementarias
                                            </Text>
                                            <Text style={styles.cadOtherPiecesText}>
                                                Manga, cuellos, vistas y complementos detallados en el plano de corte.
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </View>

                        {/* B. RESUMEN TÉCNICO EN TARJETAS VISUALES */}
                        <View style={styles.visualCardsGrid}>
                            {/* TARJETA 1: PRENDA Y PATRONAJE */}
                            <View style={styles.visualCard}>
                                <View style={styles.visualCardHeader}>
                                    <Text style={styles.visualCardSuper}>ESTRUCTURA DE CORTE</Text>
                                    <Text style={styles.visualCardTitle}>Prenda y Patronaje</Text>
                                </View>

                                <View style={styles.kpiRow}>
                                    <View style={styles.kpiItem}>
                                        <Text style={styles.kpiNumber}>{sheetData.piecesInventory.length}</Text>
                                        <Text style={styles.kpiLabel}>Piezas de Corte</Text>
                                    </View>
                                    <View style={styles.kpiDivider} />
                                    <View style={styles.kpiItem}>
                                        <Text style={styles.kpiNumber}>
                                            {roundTo(execution.geometry_result.boundingBox.width)}
                                        </Text>
                                        <Text style={styles.kpiLabel}>Ancho mm</Text>
                                    </View>
                                    <View style={styles.kpiDivider} />
                                    <View style={styles.kpiItem}>
                                        <Text style={styles.kpiNumber}>
                                            {roundTo(execution.geometry_result.boundingBox.height)}
                                        </Text>
                                        <Text style={styles.kpiLabel}>Largo mm</Text>
                                    </View>
                                </View>

                                <Text style={styles.visualCardSubHeader}>Especificaciones de taller:</Text>
                                <View style={styles.bulletList}>
                                    <Text style={styles.bulletItem}>
                                        ✦ Margen de costura perimetral: <Text style={styles.strong}>{sheetData.seamAllowanceDefaultMm} mm</Text>
                                    </Text>
                                    <Text style={styles.bulletItem}>
                                        ✦ Margen de dobladillo / bajo: <Text style={styles.strong}>{sheetData.hemAllowanceDefaultMm} mm</Text>
                                    </Text>
                                    <Text style={styles.bulletItem}>
                                        ✦ Corte: simétrico por pares al hilo y piezas al doblez según aplomo
                                    </Text>
                                </View>
                            </View>

                            {/* TARJETA 2: MATERIALES Y CONFECCIÓN */}
                            <View style={styles.visualCard}>
                                <View style={styles.visualCardHeader}>
                                    <Text style={styles.visualCardSuper}>ESPECIFICACIÓN TEXTIL</Text>
                                    <Text style={styles.visualCardTitle}>Materiales y Confección</Text>
                                </View>

                                <View style={styles.materialsStack}>
                                    <View style={styles.materialBlock}>
                                        <Text style={styles.materialTypeLabel}>TEJIDO PRINCIPAL:</Text>
                                        <Text style={styles.materialNameText}>{confectionPreset.suggestedFabric}</Text>
                                    </View>

                                    <View style={styles.materialBlock}>
                                        <Text style={styles.materialTypeLabel}>FORRO Y ENTRETELA:</Text>
                                        <Text style={styles.materialNameText}>{confectionPreset.lining}</Text>
                                        <Text style={styles.materialSubText}>{confectionPreset.interfacing}</Text>
                                    </View>

                                    <View style={styles.materialBlock}>
                                        <Text style={styles.materialTypeLabel}>AVÍOS Y FORNITURAS:</Text>
                                        {confectionPreset.notions.map((n, idx) => (
                                            <Text key={idx} style={styles.notionItemText}>• {n}</Text>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            {/* TARJETA 3: CONSUMO TEXTIL Y RENDIMIENTO */}
                            <View style={styles.visualCard}>
                                <View style={styles.visualCardHeader}>
                                    <Text style={styles.visualCardSuper}>PLANIFICACIÓN DE CORTE</Text>
                                    <Text style={styles.visualCardTitle}>Consumo Textil Estimado</Text>
                                </View>

                                <View style={styles.consumptionRow}>
                                    <View style={styles.consumptionBox}>
                                        <Text style={styles.consumptionMeters}>
                                            {sheetData.consumption.fabricWidth140cm.linearMetersWithWaste} m
                                        </Text>
                                        <Text style={styles.consumptionWidthLabel}>Ancho 140 cm</Text>
                                        <Text style={styles.consumptionWasteHint}>(incluye 10% merma)</Text>
                                    </View>

                                    <View style={styles.consumptionBox}>
                                        <Text style={styles.consumptionMeters}>
                                            {sheetData.consumption.fabricWidth150cm.linearMetersWithWaste} m
                                        </Text>
                                        <Text style={styles.consumptionWidthLabel}>Ancho 150 cm</Text>
                                        <Text style={styles.consumptionWasteHint}>(incluye 10% merma)</Text>
                                    </View>

                                    <View style={styles.consumptionBox}>
                                        <Text style={styles.consumptionMeters}>
                                            {sheetData.consumption.totalNetAreaSquareMeters} m²
                                        </Text>
                                        <Text style={styles.consumptionWidthLabel}>Área Neta</Text>
                                        <Text style={styles.consumptionWasteHint}>Superficie de piezas</Text>
                                    </View>
                                </View>

                                {/* Barra de Rendimiento y Aprovechamiento */}
                                <View style={styles.yieldMeterContainer}>
                                    <View style={styles.yieldMeterHeader}>
                                        <Text style={styles.yieldMeterLabel}>Rendimiento Geométrico de Tejido:</Text>
                                        <Text style={styles.yieldMeterValue}>~78% aprovechamiento</Text>
                                    </View>
                                    <View style={styles.yieldMeterTrack}>
                                        <View style={[styles.yieldMeterFill, { width: '78%' }]} />
                                    </View>
                                    <Text style={styles.yieldDisclaimer}>
                                        * Estimación paramétrica sujeta a la rotación y distribución definitiva en el plano de corte.
                                    </Text>
                                </View>
                            </View>

                            {/* TARJETA 4: LÍNEA DE TIEMPO DE AJUSTES Y FITTING */}
                            <View style={styles.visualCard}>
                                <View style={styles.visualCardHeader}>
                                    <Text style={styles.visualCardSuper}>LINAJE Y EVOLUCIÓN (C12)</Text>
                                    <Text style={styles.visualCardTitle}>Línea de Tiempo de Ajustes</Text>
                                </View>

                                <View style={styles.timelineContainer}>
                                    {/* Versión Base */}
                                    <View style={styles.timelineItem}>
                                        <View style={[styles.timelineDot, styles.timelineDotBase]} />
                                        <View style={styles.timelineContent}>
                                            <Text style={styles.timelineVersion}>Versión Base v1.0</Text>
                                            <Text style={styles.timelineDesc}>
                                                Generación geométrica paramétrica inicial a partir de la sesión de medidas de {sheetData.client.fullName}.
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Ajustes Registrados de Fitting */}
                                    {sheetData.lineage.adjustments.map((adj, aIdx) => (
                                        <View key={adj.id || aIdx} style={styles.timelineItem}>
                                            <View style={[styles.timelineDot, styles.timelineDotFitting]} />
                                            <View style={styles.timelineContent}>
                                                <Text style={styles.timelineVersion}>
                                                    Fitting · {adj.target_piece} ({adj.adjustment_type})
                                                </Text>
                                                <Text style={styles.timelineDelta}>
                                                    Delta: {Number(adj.delta_mm) > 0 ? `+${adj.delta_mm}` : adj.delta_mm} mm · {adj.fitting_date}
                                                </Text>
                                                {adj.description && (
                                                    <Text style={styles.timelineDesc}>{adj.description}</Text>
                                                )}
                                            </View>
                                        </View>
                                    ))}

                                    {/* Versión Activa Final */}
                                    <View style={styles.timelineItem}>
                                        <View style={[styles.timelineDot, isApproved ? styles.timelineDotApproved : styles.timelineDotDraft]} />
                                        <View style={styles.timelineContent}>
                                            <Text style={styles.timelineVersion}>
                                                {sheetData.lineage.currentVersion} (Versión Activa)
                                            </Text>
                                            <Text style={styles.timelineDesc}>
                                                {isApproved
                                                    ? '✓ Patrón auditado y aprobado para corte por Katherine Carroll.'
                                                    : 'En proceso de prueba de vestuario y entalle sastre.'}
                                            </Text>
                                        </View>
                                    </View>
                                </View>
                            </View>
                        </View>

                        {/* C. INVENTARIO DE PIEZAS DE CORTE CON VISTA TARJETA / TABLA */}
                        <View style={styles.inventorySectionCard}>
                            <View style={styles.inventorySectionHeader}>
                                <View>
                                    <Text style={styles.visualCardSuper}>DESPIECE TÉCNICO DE TALLER</Text>
                                    <Text style={styles.visualCardTitle}>
                                        Inventario de Piezas ({sheetData.piecesInventory.length} piezas geométricas)
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.toggleTableBtn}
                                    onPress={() => setShowFullPiecesTable(!showFullPiecesTable)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.toggleTableBtnText}>
                                        {showFullPiecesTable ? 'Ver Formato Tarjetas' : 'Ver Tabla Detallada'}
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Vista en Tarjetas Visuales de Piezas */}
                            {!showFullPiecesTable ? (
                                <View style={styles.pieceCardsGrid}>
                                    {sheetData.piecesInventory.map((p) => (
                                        <View key={p.id} style={styles.pieceInventoryCard}>
                                            <View style={styles.pieceCardTopRow}>
                                                <Text style={styles.pieceCardCode}>{p.code}</Text>
                                                <View style={styles.pieceCardCutBadge}>
                                                    <Text style={styles.pieceCardCutBadgeText}>
                                                        Cortar: {p.quantityToCut}x
                                                    </Text>
                                                </View>
                                            </View>

                                            <Text style={styles.pieceCardName}>{p.name}</Text>
                                            <Text style={styles.pieceCardCutDesc}>{p.cutDescription}</Text>

                                            <View style={styles.pieceCardSpecsRow}>
                                                <View style={styles.pieceCardSpecItem}>
                                                    <Text style={styles.pieceCardSpecLabel}>Dimensiones:</Text>
                                                    <Text style={styles.pieceCardSpecVal}>{p.widthMm} × {p.heightMm} mm</Text>
                                                </View>
                                                <View style={styles.pieceCardSpecItem}>
                                                    <Text style={styles.pieceCardSpecLabel}>Costura:</Text>
                                                    <Text style={styles.pieceCardSpecVal}>{p.seamAllowanceMm} mm</Text>
                                                </View>
                                            </View>

                                            <View style={styles.pieceCardFooter}>
                                                <Text style={styles.pieceCardNotches}>
                                                    Piquetes: {p.notchesCount} · Pinzas: {p.dartsCount}
                                                </Text>
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            ) : (
                                /* Vista en Tabla Tabular para Taller */
                                <View style={styles.piecesTable}>
                                    <View style={styles.tableHeaderRow}>
                                        <Text style={[styles.thCell, { flex: 1.5 }]}>Código</Text>
                                        <Text style={[styles.thCell, { flex: 2.5 }]}>Pieza</Text>
                                        <Text style={[styles.thCell, { flex: 0.8, textAlign: 'center' }]}>Cant.</Text>
                                        <Text style={[styles.thCell, { flex: 2 }]}>Corte</Text>
                                        <Text style={[styles.thCell, { flex: 1.8, textAlign: 'right' }]}>Dimensiones</Text>
                                        <Text style={[styles.thCell, { flex: 1, textAlign: 'center' }]}>Margen</Text>
                                    </View>
                                    {sheetData.piecesInventory.map((p) => (
                                        <View key={p.id} style={styles.tableDataRow}>
                                            <Text style={[styles.tdCell, { flex: 1.5, fontFamily: 'monospace', fontSize: 10 }]}>
                                                {p.code}
                                            </Text>
                                            <Text style={[styles.tdCell, { flex: 2.5, fontWeight: '700' }]}>{p.name}</Text>
                                            <Text style={[styles.tdCell, { flex: 0.8, textAlign: 'center', fontWeight: '800' }]}>
                                                {p.quantityToCut}
                                            </Text>
                                            <Text style={[styles.tdCell, { flex: 2 }]}>{p.cutDescription}</Text>
                                            <Text style={[styles.tdCell, { flex: 1.8, textAlign: 'right' }]}>
                                                {p.widthMm} × {p.heightMm} mm
                                            </Text>
                                            <Text style={[styles.tdCell, { flex: 1, textAlign: 'center' }]}>
                                                {p.seamAllowanceMm} mm
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            )}
                        </View>
                    </ScrollView>
                )}

                {/* ============================================================================== */}
                {/* CONTENIDO: PESTAÑA 2 - PLANO DE CORTE CON VISOR CAD INTEGRADO */}
                {/* ============================================================================== */}
                {activeTab === 'layout' && (
                    <View style={styles.layoutTabArea}>
                        {/* Visor CAD Unificado con Zoom Centrado y Desplazamiento Fluido */}
                        <View style={styles.canvasWrapper}>
                            <PatternPreviewCanvas
                                geometry={execution.geometry_result}
                                title={`Plano de Corte — ${sheetData.garmentName}`}
                                fullHeight
                                headerRightAction={
                                    <TouchableOpacity
                                        style={styles.printFromLayoutBtn}
                                        onPress={handlePrintTiledWithCover}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={styles.printFromLayoutBtnText}>🖨 Imprimir Mosaico</Text>
                                    </TouchableOpacity>
                                }
                            />
                        </View>
                    </View>
                )}

                {/* ============================================================================== */}
                {/* CONTENIDO: PESTAÑA 3 - ENTREGABLES & PAQUETE CAD INDUSTRIAL */}
                {/* ============================================================================== */}
                {activeTab === 'exports' && (
                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator>
                        <View style={styles.exportsHeaderCard}>
                            <Text style={styles.exportsSuperTitle}>PAQUETE INDUSTRIAL DE CORTE</Text>
                            <Text style={styles.exportsMainTitle}>Archivos Técnicos y Entregables de Producción</Text>
                            <Text style={styles.exportsDescription}>
                                Todos los formatos conservan escala física 1:1, aplomos y marcas de registro para corte manual o automatizado.
                            </Text>
                        </View>

                        <View style={styles.exportsGrid}>
                            {/* ENTREGABLE 1: Mosaico 1:1 PDF con Portada */}
                            <View style={styles.exportCard}>
                                <View style={styles.exportCardHeader}>
                                    <View style={styles.exportIconBox}>
                                        <Text style={styles.exportIcon}>🖨</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.exportCardTitle}>Impresión en Mosaico (A4 / Carta)</Text>
                                        <Text style={styles.exportCardFormat}>PDF Multipage · 100% Escala Real</Text>
                                    </View>
                                </View>

                                <Text style={styles.exportCardDesc}>
                                    Genera la Ficha Técnica Oficial en la Hoja 1, seguida de las piezas de patrón fragmentadas en cuadrícula con marcas de corte y cuadrado de calibración (100×100 mm).
                                </Text>

                                <TouchableOpacity
                                    style={styles.exportActionBtnPrimary}
                                    onPress={handlePrintTiledWithCover}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.exportActionBtnPrimaryText}>Imprimir Mosaico 1:1</Text>
                                </TouchableOpacity>
                            </View>

                            {/* ENTREGABLE 2: Archivo Vectorial SVG a Escala 1:1 */}
                            <View style={styles.exportCard}>
                                <View style={styles.exportCardHeader}>
                                    <View style={styles.exportIconBox}>
                                        <Text style={styles.exportIcon}>💾</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.exportCardTitle}>Archivo Vectorial SVG (1:1 mm)</Text>
                                        <Text style={styles.exportCardFormat}>Vectorial W3C · Milimétrico Puro</Text>
                                    </View>
                                </View>

                                <Text style={styles.exportCardDesc}>
                                    Trazado vectorial exacto con capas independientes para corte exterior, costura neta, hilo de tela, piquetes y textos técnicos. Apto para plotters de patronaje y corte láser.
                                </Text>

                                <TouchableOpacity
                                    style={styles.exportActionBtnSecondary}
                                    onPress={handleExportCertifiedSvg}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.exportActionBtnSecondaryText}>Descargar Archivo SVG</Text>
                                </TouchableOpacity>
                            </View>

                            {/* ENTREGABLE 3: CAD Industrial DXF (AutoCAD R12) */}
                            <View style={styles.exportCard}>
                                <View style={styles.exportCardHeader}>
                                    <View style={styles.exportIconBox}>
                                        <Text style={styles.exportIcon}>📐</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.exportCardTitle}>Archivo CAD DXF (AutoCAD R12)</Text>
                                        <Text style={styles.exportCardFormat}>Formato CAD/CAM Industrial</Text>
                                    </View>
                                </View>

                                <Text style={styles.exportCardDesc}>
                                    Estructurado con capas normalizadas (CORTE_EXTERIOR, COSTURA_NETA, HILO_TELA, PIQUETES). Totalmente compatible con Gerber, Lectra, Audaces, Optitex y software CNC.
                                </Text>

                                <TouchableOpacity
                                    style={styles.exportActionBtnSecondary}
                                    onPress={handleExportCertifiedDxf}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.exportActionBtnSecondaryText}>Exportar CAD DXF</Text>
                                </TouchableOpacity>
                            </View>

                            {/* ENTREGABLE 4: Ficha Técnica Oficial de Taller (A4) */}
                            <View style={styles.exportCard}>
                                <View style={styles.exportCardHeader}>
                                    <View style={styles.exportIconBox}>
                                        <Text style={styles.exportIcon}>📄</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.exportCardTitle}>Ficha Técnica de Taller (Hoja Sola)</Text>
                                        <Text style={styles.exportCardFormat}>Documento de Especificación A4</Text>
                                    </View>
                                </View>

                                <Text style={styles.exportCardDesc}>
                                    Documento formal para costura y corte que resume medidas, consumos, lista de piezas, tolerancias y espacio para firma de aprobación por la diseñadora.
                                </Text>

                                <TouchableOpacity
                                    style={styles.exportActionBtnSecondary}
                                    onPress={handlePrintSpecificationSheet}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.exportActionBtnSecondaryText}>Imprimir Ficha Sola</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F2E9', // Marfil cálido
        ...Platform.select({
            web: {
                height: '100vh' as any,
                maxHeight: '100vh' as any,
                overflow: 'hidden' as any,
                display: 'flex' as any,
                flexDirection: 'column' as any,
            },
        }),
    },
    modalHeaderCompact: {
        paddingTop: Platform.OS === 'ios' ? 44 : 10,
        paddingBottom: 8,
    },
    mainTitleCompact: {
        fontSize: 14,
    },
    gatingBannerCompact: {
        paddingVertical: 5,
        paddingHorizontal: 14,
    },
    gatingIconBoxCompact: {
        width: 22,
        height: 22,
        borderRadius: 11,
    },
    tabBtnCompact: {
        paddingVertical: 8,
    },
    modalHeader: {
        backgroundColor: '#171411', // Negro atelier
        paddingHorizontal: 20,
        paddingTop: Platform.OS === 'ios' ? 48 : 16,
        paddingBottom: 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#2C2621',
    },
    modalHeaderTitles: {
        flex: 1,
        paddingRight: 12,
    },
    superTitle: {
        color: '#A78350', // Oro champagne
        fontSize: 9.5,
        fontWeight: '800',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    mainTitle: {
        color: '#FAF7F2',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
        marginTop: 2,
    },
    modalSubtitle: {
        color: '#8E8478',
        fontSize: 11,
        marginTop: 2,
    },
    closeBtn: {
        backgroundColor: '#26221E',
        paddingVertical: 7,
        paddingHorizontal: 14,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#423B33',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    closeBtnText: {
        color: '#FAF7F2',
        fontSize: 11.5,
        fontWeight: '700',
    },
    gatingBanner: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderBottomWidth: 1,
    },
    gatingBannerApproved: {
        backgroundColor: '#EEF7F0',
        borderBottomColor: '#C4E5CB',
    },
    gatingBannerDraft: {
        backgroundColor: '#FAF3EA',
        borderBottomColor: '#E6D9C8',
    },
    gatingIconBox: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    gatingIconBoxApproved: {
        backgroundColor: '#28733E',
    },
    gatingIconBoxDraft: {
        backgroundColor: '#A78350',
    },
    gatingIcon: {
        fontSize: 15,
        fontWeight: '900',
        color: '#FFFFFF',
    },
    gatingTitle: {
        fontSize: 11.5,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    gatingTitleApproved: {
        color: '#1E5E32',
    },
    gatingTitleDraft: {
        color: '#8A6A4A',
    },
    gatingSub: {
        fontSize: 10.5,
        color: '#6E665B',
        marginTop: 2,
        lineHeight: 14,
    },
    tabsRow: {
        flexDirection: 'row',
        backgroundColor: '#EDE5D6',
        borderBottomWidth: 1,
        borderBottomColor: '#D8CBB6',
    },
    tabBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderBottomWidth: 3,
        borderBottomColor: 'transparent',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    tabBtnActive: {
        borderBottomColor: '#A78350',
        backgroundColor: '#F8F2E9',
    },
    tabText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#766B62',
    },
    tabTextActive: {
        color: '#171411',
        fontWeight: '800',
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
        gap: 16,
    },

    // ==============================================================================
    // SECCIÓN A: ENCABEZADO EDITORIAL DE LA PRENDA
    // ==============================================================================
    editorialHeaderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 18,
        ...Platform.select({
            web: {
                boxShadow: '0 4px 18px rgba(23, 20, 17, 0.05)',
            },
        }),
    },
    editorialHeaderRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 20,
    },
    editorialPhotoContainer: {
        width: 190,
        height: 250,
        borderRadius: 8,
        overflow: 'hidden',
        borderWidth: 1.5,
        borderColor: '#C5A059',
        backgroundColor: '#1E1B18',
        position: 'relative',
    },
    editorialPhoto: {
        width: '100%',
        height: '100%',
    },
    editorialPhotoBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(23, 20, 17, 0.85)',
        paddingHorizontal: 7,
        paddingVertical: 3,
        borderRadius: 4,
        zIndex: 2,
    },
    editorialPhotoBadgeText: {
        fontSize: 7.5,
        fontWeight: '800',
        color: '#F4ECE0',
        letterSpacing: 0.6,
    },
    editorialPhotoCaption: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        right: 8,
        fontSize: 9,
        fontWeight: '600',
        color: '#FFFFFF',
        backgroundColor: 'rgba(23, 20, 17, 0.75)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 3,
        textAlign: 'center',
    },
    editorialInfoColumn: {
        flex: 1,
        minWidth: 260,
        justifyContent: 'space-between',
    },
    editorialGoldRule: {
        width: 40,
        height: 3,
        backgroundColor: '#A78350',
        marginBottom: 8,
    },
    editorialGarmentTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#171411',
        letterSpacing: 0.5,
    },
    editorialClientName: {
        fontSize: 13,
        color: '#766B62',
        marginTop: 4,
    },
    editorialClientHighlight: {
        color: '#8A6A4A',
        fontWeight: '700',
    },
    editorialMetaGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: 14,
        backgroundColor: '#FAF7F2',
        padding: 12,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#EFE7DA',
    },
    editorialMetaItem: {
        width: '45%',
        minWidth: 120,
    },
    editorialMetaLabel: {
        fontSize: 8.5,
        fontWeight: '800',
        color: '#8A8275',
        letterSpacing: 0.8,
    },
    editorialMetaVal: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#26221E',
        marginTop: 1,
    },
    valApproved: {
        color: '#1E6B38',
    },
    valDraft: {
        color: '#8A6A4A',
    },
    editorialPrintBtn: {
        marginTop: 14,
        backgroundColor: '#FAF5EA',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#C5A059',
        alignSelf: 'flex-start',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    editorialPrintBtnText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8A6A4A',
    },

    // BOCETOS TÉCNICOS VECTORIALES (DELANTERO Y ESPALDA)
    cadSketchesSection: {
        marginTop: 18,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#EBE2D3',
    },
    cadSketchesHeader: {
        marginBottom: 10,
    },
    cadSketchesTitle: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 0.8,
        color: '#171411',
    },
    cadSketchesSubtitle: {
        fontSize: 10,
        color: '#766B62',
        marginTop: 1,
    },
    cadSketchesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    cadSketchCard: {
        flex: 1,
        minWidth: 160,
        backgroundColor: '#FAF8F4',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6DCC8',
        padding: 10,
        alignItems: 'center',
    },
    cadSketchBadgeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 6,
    },
    cadSketchBadgeLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: '#8A6A4A',
        letterSpacing: 0.8,
    },
    cadSketchBadgeCount: {
        fontSize: 8.5,
        fontWeight: '600',
        color: '#766B62',
    },
    cadSketchSvgBox: {
        width: '100%',
        height: 140,
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#EDE5D6',
        padding: 4,
    },
    cadSketchDimText: {
        fontSize: 9,
        fontWeight: '700',
        color: '#5C5446',
        marginTop: 6,
    },
    cadSketchFallback: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    cadSketchFallbackText: {
        fontSize: 11,
        color: '#766B62',
    },
    cadOtherPiecesNotice: {
        flex: 1,
        minWidth: 140,
        backgroundColor: '#FAF7F2',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 12,
        justifyContent: 'center',
    },
    cadOtherPiecesTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8A6A4A',
    },
    cadOtherPiecesText: {
        fontSize: 10,
        color: '#766B62',
        marginTop: 3,
        lineHeight: 14,
    },

    // ==============================================================================
    // SECCIÓN B: TARJETAS VISUALES TÉCNICAS
    // ==============================================================================
    visualCardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    visualCard: {
        flex: 1,
        minWidth: 280,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 16,
        ...Platform.select({
            web: {
                boxShadow: '0 2px 10px rgba(23, 20, 17, 0.04)',
            },
        }),
    },
    visualCardHeader: {
        borderBottomWidth: 1,
        borderBottomColor: '#EFE7DA',
        paddingBottom: 8,
        marginBottom: 12,
    },
    visualCardSuper: {
        fontSize: 8.5,
        fontWeight: '800',
        letterSpacing: 1,
        color: '#A78350',
    },
    visualCardTitle: {
        fontSize: 14,
        fontWeight: '800',
        color: '#171411',
        marginTop: 2,
    },
    kpiRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        backgroundColor: '#FAF7F2',
        borderRadius: 6,
        paddingVertical: 10,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#EFE7DA',
    },
    kpiItem: {
        alignItems: 'center',
    },
    kpiNumber: {
        fontSize: 18,
        fontWeight: '900',
        color: '#171411',
    },
    kpiLabel: {
        fontSize: 9,
        fontWeight: '600',
        color: '#766B62',
        marginTop: 2,
    },
    kpiDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E0D4C2',
    },
    visualCardSubHeader: {
        fontSize: 10,
        fontWeight: '700',
        color: '#5C5446',
        marginBottom: 6,
    },
    bulletList: {
        gap: 5,
    },
    bulletItem: {
        fontSize: 10.5,
        color: '#665B47',
        lineHeight: 15,
    },
    strong: {
        fontWeight: '700',
        color: '#171411',
    },

    // Tarjeta Materiales
    materialsStack: {
        gap: 10,
    },
    materialBlock: {
        backgroundColor: '#FAF8F5',
        padding: 8,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#EDE5D6',
    },
    materialTypeLabel: {
        fontSize: 8.5,
        fontWeight: '800',
        color: '#8A6A4A',
        letterSpacing: 0.8,
    },
    materialNameText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#26221E',
        marginTop: 2,
    },
    materialSubText: {
        fontSize: 10,
        color: '#766B62',
        marginTop: 1,
    },
    notionItemText: {
        fontSize: 10,
        color: '#5C5243',
        marginTop: 1,
    },

    // Tarjeta Consumo
    consumptionRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },
    consumptionBox: {
        flex: 1,
        backgroundColor: '#FAF7F2',
        borderRadius: 6,
        padding: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#EAE1D2',
    },
    consumptionMeters: {
        fontSize: 16,
        fontWeight: '900',
        color: '#171411',
    },
    consumptionWidthLabel: {
        fontSize: 9.5,
        fontWeight: '700',
        color: '#8A6A4A',
        marginTop: 2,
        textAlign: 'center',
    },
    consumptionWasteHint: {
        fontSize: 8,
        color: '#8C8275',
        marginTop: 1,
        textAlign: 'center',
    },
    yieldMeterContainer: {
        backgroundColor: '#FAF9F6',
        borderRadius: 6,
        padding: 10,
        borderWidth: 1,
        borderColor: '#ECE4D6',
    },
    yieldMeterHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    yieldMeterLabel: {
        fontSize: 9.5,
        fontWeight: '600',
        color: '#6E6456',
    },
    yieldMeterValue: {
        fontSize: 10,
        fontWeight: '800',
        color: '#1E6B38',
    },
    yieldMeterTrack: {
        height: 6,
        backgroundColor: '#E6D9C8',
        borderRadius: 3,
        overflow: 'hidden',
    },
    yieldMeterFill: {
        height: '100%',
        backgroundColor: '#A78350',
    },
    yieldDisclaimer: {
        fontSize: 8.5,
        color: '#8A8275',
        fontStyle: 'italic',
        marginTop: 6,
    },

    // Tarjeta Línea de Tiempo
    timelineContainer: {
        paddingLeft: 12,
        borderLeftWidth: 2,
        borderLeftColor: '#E6D9C8',
        gap: 12,
        marginLeft: 6,
    },
    timelineItem: {
        position: 'relative',
    },
    timelineDot: {
        position: 'absolute',
        left: -18,
        top: 2,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#A78350',
        borderWidth: 2,
        borderColor: '#FFFFFF',
    },
    timelineDotBase: {
        backgroundColor: '#766B62',
    },
    timelineDotFitting: {
        backgroundColor: '#8A6A4A',
    },
    timelineDotApproved: {
        backgroundColor: '#28733E',
    },
    timelineDotDraft: {
        backgroundColor: '#C5A059',
    },
    timelineContent: {
        paddingLeft: 4,
    },
    timelineVersion: {
        fontSize: 11,
        fontWeight: '700',
        color: '#171411',
    },
    timelineDelta: {
        fontSize: 9.5,
        fontWeight: '600',
        color: '#8A6A4A',
        marginTop: 1,
    },
    timelineDesc: {
        fontSize: 9.5,
        color: '#766B62',
        marginTop: 1,
        lineHeight: 13,
    },

    // ==============================================================================
    // SECCIÓN C: INVENTARIO DE PIEZAS (TARJETAS / TABLA)
    // ==============================================================================
    inventorySectionCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 16,
    },
    inventorySectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#EFE7DA',
        paddingBottom: 10,
        marginBottom: 14,
    },
    toggleTableBtn: {
        backgroundColor: '#FAF5EA',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
        borderWidth: 1,
        borderColor: '#D8CBB6',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    toggleTableBtnText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#8A6A4A',
    },
    pieceCardsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    pieceInventoryCard: {
        flex: 1,
        minWidth: 180,
        maxWidth: 240,
        backgroundColor: '#FAF9F6',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: '#EAE1D2',
        padding: 10,
    },
    pieceCardTopRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    pieceCardCode: {
        fontSize: 9,
        fontWeight: '800',
        color: '#8A8275',
        fontFamily: 'monospace',
    },
    pieceCardCutBadge: {
        backgroundColor: '#EDE5D6',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    pieceCardCutBadgeText: {
        fontSize: 9,
        fontWeight: '800',
        color: '#363028',
    },
    pieceCardName: {
        fontSize: 11.5,
        fontWeight: '700',
        color: '#171411',
        marginBottom: 2,
    },
    pieceCardCutDesc: {
        fontSize: 9.5,
        color: '#766B62',
        marginBottom: 6,
    },
    pieceCardSpecsRow: {
        borderTopWidth: 1,
        borderTopColor: '#ECE3D4',
        paddingTop: 6,
        gap: 2,
    },
    pieceCardSpecItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    pieceCardSpecLabel: {
        fontSize: 9,
        color: '#8A8275',
    },
    pieceCardSpecVal: {
        fontSize: 9.5,
        fontWeight: '600',
        color: '#26221E',
    },
    pieceCardFooter: {
        marginTop: 6,
        borderTopWidth: 1,
        borderTopColor: '#ECE3D4',
        paddingTop: 4,
    },
    pieceCardNotches: {
        fontSize: 8.5,
        color: '#9C9182',
    },
    piecesTable: {
        borderWidth: 1,
        borderColor: '#E6D9C8',
        borderRadius: 6,
        overflow: 'hidden',
    },
    tableHeaderRow: {
        flexDirection: 'row',
        backgroundColor: '#171411',
        paddingVertical: 8,
        paddingHorizontal: 10,
    },
    thCell: {
        color: '#FAF7F2',
        fontSize: 9.5,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    tableDataRow: {
        flexDirection: 'row',
        paddingVertical: 7,
        paddingHorizontal: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0ECE4',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    tdCell: {
        fontSize: 10.5,
        color: '#26221E',
    },

    // ==============================================================================
    // SECCIÓN D: PESTAÑA PLANO DE CORTE CON VISOR CAD INTEGRADO
    // ==============================================================================
    layoutTabArea: {
        flex: 1,
        backgroundColor: '#F8F2E9',
        padding: 4,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        height: '100%',
        minHeight: 480,
    },
    printFromLayoutBtn: {
        backgroundColor: '#A78350',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 5,
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    printFromLayoutBtnText: {
        fontSize: 10.5,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    canvasWrapper: {
        flex: 1,
        width: '100%',
        height: '100%',
        minHeight: 450,
        overflow: 'hidden',
    },

    // ==============================================================================
    // SECCIÓN E: PESTAÑA ENTREGABLES & CAD INDUSTRIAL
    // ==============================================================================
    exportsHeaderCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 16,
    },
    exportsSuperTitle: {
        fontSize: 8.5,
        fontWeight: '800',
        color: '#A78350',
        letterSpacing: 1.2,
    },
    exportsMainTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#171411',
        marginTop: 2,
    },
    exportsDescription: {
        fontSize: 11,
        color: '#766B62',
        marginTop: 3,
    },
    exportsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 14,
    },
    exportCard: {
        flex: 1,
        minWidth: 280,
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E6D9C8',
        padding: 16,
        justifyContent: 'space-between',
        ...Platform.select({
            web: {
                boxShadow: '0 2px 10px rgba(23, 20, 17, 0.04)',
            },
        }),
    },
    exportCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    exportIconBox: {
        width: 36,
        height: 36,
        borderRadius: 6,
        backgroundColor: '#FAF5EA',
        borderWidth: 1,
        borderColor: '#E6DCC8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    exportIcon: {
        fontSize: 18,
    },
    exportCardTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#171411',
    },
    exportCardFormat: {
        fontSize: 9.5,
        fontWeight: '600',
        color: '#8A6A4A',
        marginTop: 1,
    },
    exportCardDesc: {
        fontSize: 10.5,
        color: '#6E6456',
        lineHeight: 15,
        marginBottom: 14,
    },
    exportActionBtnPrimary: {
        backgroundColor: '#A78350',
        paddingVertical: 9,
        borderRadius: 6,
        alignItems: 'center',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    exportActionBtnPrimaryText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    exportActionBtnSecondary: {
        backgroundColor: '#171411',
        paddingVertical: 9,
        borderRadius: 6,
        alignItems: 'center',
        ...Platform.select({
            web: {
                cursor: 'pointer',
            },
        }),
    },
    exportActionBtnSecondaryText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
});
