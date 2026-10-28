// ==============================================================================
// ATELIER DIGITAL — VISTAS EDITORIALES DEL FLUJO C · PATRÓN PARA UNA CREACIÓN
// Archivo: src/components/pattern/creationFlow/CreationFlowViews.tsx
// ==============================================================================
// Componentes de presentación (sin acceso a Supabase). Reciben datos reales ya
// derivados por creationFlowModel.ts. Nada de lo que se pinta aquí se inventa:
// si un dato no existe, se muestra un estado vacío que explica cómo resolverlo.
// ==============================================================================

import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Image,
    Modal,
    PanResponder,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    useWindowDimensions,
    View,
} from 'react-native';
import { GARMENT_PACKAGES } from '../../../engine/pattern/catalog/garmentPackages';
import { getMeasurementGuide } from '../../../engine/pattern/catalog/measurementGuideCatalog';
import { exportPatternToSvg } from '../../../engine/pattern/export/svgExporter';
import { pathToSvgD, roundTo } from '../../../engine/pattern/geometry/geometry2d';
import { PatternGeometryResult, PatternPiece } from '../../../engine/pattern/geometry/types';
import { colors } from '../../../theme/colors';
import { typography } from '../../../theme/typography';
import { Client } from '../../../types/client';
import { AtelierClientSelector } from '../AtelierClientSelector';
import { Creation } from '../../../types/creation';
import { MeasurementSession } from '../../../types/pattern/measurement';
import { GarmentType, PatternAdjustment, PatternExecution } from '../../../types/pattern/pattern';
import {
    CREATION_STAGES,
    CREATION_STATUS_LABELS,
    CREATION_TYPE_LABELS,
    CreationFlowSummary,
    CreationStageId,
    CreationTimelineNode,
    CreationFabricProfile,
    deriveCreationFabricProfile,
    GarmentMeasureDiagnosis,
    GarmentMeasureRow,
    PatternLinkState,
    StageStatus,
    describeSession,
    formatShortDateEs,
    isKnownGarmentType,
} from './creationFlowModel';

// ------------------------------------------------------------------------------
// PALETA "ATELIER DE AUTOR" (Katherine Carroll Haute Couture)
// ------------------------------------------------------------------------------
export const ATELIER_CREATION_PALETTE = {
    warmIvory: '#F8F2E9',      // Marfil cálido de fondo
    atelierBlack: '#171411',   // Negro atelier
    champagneGold: '#A78350',  // Oro champagne
    sand: '#E6D9C8',           // Arena refinada
    bronze: '#8A6A4A',         // Bronce de acento
} as const;

// ------------------------------------------------------------------------------
// RECURSOS VISUALES (todos locales; inventariados en assets/licenses)
// ------------------------------------------------------------------------------

const GARMENT_EDITORIAL: Record<string, any> = {
    skirt: require('../../../../assets/garments/skirt.jpg'),
    bodice: require('../../../../assets/garments/bodice.jpg'),
    pants: require('../../../../assets/garments/pants.jpg'),
    dress: require('../../../../assets/garments/dress.jpg'),
    sleeve: require('../../../../assets/garments/sleeve.jpg'),
    blouse: require('../../../../assets/garments/blouse.jpg'),
    shirt: require('../../../../assets/garments/shirt.jpg'),
    corset: require('../../../../assets/garments/corset.jpg'),
    jacket: require('../../../../assets/garments/jacket.jpg'),
    coat: require('../../../../assets/garments/coat.jpg'),
    shirt_dress: require('../../../../assets/garments/shirt_dress.jpg'),
    tailored_vest: require('../../../../assets/garments/tailored_vest.jpg'),
    short: require('../../../../assets/garments/short.jpg'),
    cargo_pants: require('../../../../assets/garments/cargo_pants.jpg'),
    trench_coat: require('../../../../assets/garments/trench_coat.jpg'),
    atelier_robe: require('../../../../assets/garments/atelier_robe.jpg'),
    evening_gown: require('../../../../assets/garments/evening_gown.jpg'),
    bridal_gown: require('../../../../assets/garments/bridal_gown.jpg'),
    draped_asymmetric_dress: require('../../../../assets/garments/draped_asymmetric_dress.jpg'),
    bomber_jacket: require('../../../../assets/garments/bomber_jacket.jpg'),
    denim_couture_jacket: require('../../../../assets/garments/denim_couture_jacket.jpg'),
};

const TOILE_IMAGE = require('../../../../assets/creation/toile_muslin.jpg');
const ATELIER_CLIENTS_IMAGE = require('../../../../assets/creation/atelier_clients_satisfaction.jpg');

/**
 * Cantidad de piezas que produce cada generador (verificada por las pruebas 440
 * de scratch/testEngine.js). Si ya existe geometría generada, se prefiere el conteo real.
 */
export const GARMENT_PIECE_COUNTS: Record<GarmentType, number> = {
    skirt: 2,
    bodice: 2,
    pants: 2,
    dress: 5,
    sleeve: 1,
    blouse: 3,
    shirt: 11,
    corset: 10,
    jacket: 16,
    coat: 17,
    shirt_dress: 13,
    tailored_vest: 7,
    short: 5,
    cargo_pants: 7,
    trench_coat: 13,
    atelier_robe: 8,
    evening_gown: 7,
    bridal_gown: 8,
    draped_asymmetric_dress: 6,
    bomber_jacket: 7,
    denim_couture_jacket: 14,
};

export interface ZoomTarget {
    source: any;
    title: string;
    caption?: string;
}

const mmToCm = (mm: number | null | undefined): string =>
    typeof mm === 'number' && Number.isFinite(mm) ? `${(Math.round(mm) / 10).toString().replace('.', ',')} cm` : 'No registrada';

// ------------------------------------------------------------------------------
// ATOMOS: tarjeta plegable, etiqueta editorial, estado vacío
// ------------------------------------------------------------------------------

export function EditorialCard(props: {
    eyebrow?: string;
    title?: string;
    children: React.ReactNode;
    collapsible?: boolean;
    defaultCollapsed?: boolean;
    right?: React.ReactNode;
    tone?: 'light' | 'dark';
    testID?: string;
}) {
    const { eyebrow, title, children, collapsible = false, defaultCollapsed = false, right, tone = 'light', testID } = props;
    const [collapsed, setCollapsed] = useState(defaultCollapsed);
    const dark = tone === 'dark';
    return (
        <View style={[s.card, dark && s.cardDark]} testID={testID}>
            {(eyebrow || title) && (
                <TouchableOpacity
                    activeOpacity={collapsible ? 0.7 : 1}
                    disabled={!collapsible}
                    onPress={() => setCollapsed((c) => !c)}
                    style={s.cardHeader}
                    accessibilityRole={collapsible ? 'button' : undefined}
                    accessibilityLabel={collapsible ? `${title || eyebrow}: ${collapsed ? 'expandir' : 'contraer'}` : undefined}
                >
                    <View style={{ flex: 1 }}>
                        {!!eyebrow && <Text style={[s.eyebrow, dark && { color: colors.champagneGold }]}>{eyebrow}</Text>}
                        {!!title && <Text style={[s.cardTitle, dark && { color: '#FFFFFF' }]}>{title}</Text>}
                    </View>
                    {right}
                    {collapsible && <Text style={[s.chevron, dark && { color: colors.champagneGold }]}>{collapsed ? '▾' : '▴'}</Text>}
                </TouchableOpacity>
            )}
            {!collapsed && <View>{children}</View>}
        </View>
    );
}

export function EmptyState(props: { title: string; hint: string }) {
    return (
        <View style={s.empty}>
            <Text style={s.emptyTitle}>{props.title}</Text>
            <Text style={s.emptyHint}>{props.hint}</Text>
        </View>
    );
}

// ------------------------------------------------------------------------------
// 1. STEPPER — «¿En qué etapa estás?»
// ------------------------------------------------------------------------------

const STAGE_STATUS_WORD: Record<StageStatus, string> = {
    done: '✓ Completada',
    attention: '! Advertencias',
    pending: '○ Pendiente',
    blocked: '– Bloqueada',
};

/**
 * Único mecanismo de navegación principal entre etapas del Flujo C.
 * Las siete etapas se pintan SIEMPRE completas (sin ScrollView horizontal):
 *  - escritorio / tableta horizontal: una sola fila de siete fichas;
 *  - tableta vertical: dos filas;
 *  - móvil: tres columnas compactas.
 * El estado nunca se comunica solo con color: cada ficha lleva palabra + símbolo.
 * La descripción complementaria solo se muestra para la etapa activa.
 */
export function CreationStepper(props: {
    summary: CreationFlowSummary;
    activeStage: CreationStageId;
    onSelect: (stage: CreationStageId) => void;
    showTitle?: boolean;
}) {
    const { summary, activeStage, onSelect, showTitle } = props;
    const { width } = useWindowDimensions();
    const density: 'wide' | 'medium' | 'compact' = width >= 1000 ? 'wide' : width >= 600 ? 'medium' : 'compact';
    const basis = density === 'wide' ? '12.4%' : density === 'medium' ? '23.5%' : '31.5%';
    const activeDef = CREATION_STAGES.find((st) => st.id === activeStage) || CREATION_STAGES[0];
    const activeInfo = summary.stages[activeDef.id];
    return (
        <View style={s.stepperWrap} testID="creation-stepper">
            {showTitle && <Text style={s.stepperTitle}>¿En qué etapa estás?</Text>}
            <View style={s.stepperGrid} testID="creation-stepper-grid">
                {CREATION_STAGES.map((st) => {
                    const info = summary.stages[st.id];
                    const active = st.id === activeStage;
                    const statusWord = active
                        ? info.status === 'attention'
                            ? '● Actual · aviso'
                            : '● Actual'
                        : STAGE_STATUS_WORD[info.status];
                    return (
                        <TouchableOpacity
                            key={st.id}
                            testID={`stage-${st.id}`}
                            style={[
                                s.stepTile,
                                { flexBasis: basis },
                                density === 'compact' && s.stepTileCompact,
                                active && s.stepTileActive,
                                info.status === 'blocked' && !active && s.stepTileBlocked,
                            ]}
                            onPress={() => onSelect(st.id)}
                            activeOpacity={0.75}
                            accessibilityRole="button"
                            accessibilityState={{ selected: active }}
                            accessibilityLabel={`Etapa ${st.order} de ${CREATION_STAGES.length}: ${st.label}. ${statusWord.replace(/^[^\wÁÉÍÓÚáéíóú]+/, '')}. ${info.hint}`}
                        >
                            <View
                                style={[
                                    s.stepNum,
                                    info.status === 'done' && s.stepNumDone,
                                    info.status === 'attention' && s.stepNumAttention,
                                    active && s.stepNumActive,
                                ]}
                            >
                                <Text style={[s.stepNumText, (active || info.status === 'done' || info.status === 'attention') && { color: '#FFFFFF' }]}>
                                    {String(st.order).padStart(2, '0')}
                                </Text>
                            </View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                                <Text style={[s.stepName, active && { color: '#FFFFFF' }]} numberOfLines={2}>
                                    {st.label}
                                </Text>
                                <Text style={[s.stepStatus, active && { color: colors.sand }]} numberOfLines={2}>
                                    {statusWord}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </View>
            <View style={s.stepperActiveNote} testID="creation-stepper-active-note">
                <Text style={s.stepperActiveNoteText}>
                    <Text style={{ fontWeight: '800', color: colors.atelierBlack }}>
                        {String(activeDef.order).padStart(2, '0')} · {activeDef.label}
                    </Text>
                    {activeInfo?.hint ? `  —  ${activeInfo.hint}` : ''}
                </Text>
            </View>
        </View>
    );
}

// ------------------------------------------------------------------------------
// 2. CABECERA DE CONTEXTO PERMANENTE (todas las etapas)
// ------------------------------------------------------------------------------

export type ContextInfoKind = 'client' | 'creation' | 'garment' | 'session';

/**
 * Cabecera persistente en DOS filas compactas, sin truncar los textos:
 *   fila superior  → clienta y creación (+ acción «Cambiar»)
 *   fila inferior  → prenda técnica, sesión de medidas y patrón
 * Un dato ausente se muestra con un estado explícito; jamás con datos de otra entidad.
 */
export function CreationContextBar(props: {
    client: Client | null;
    creation: Creation | null;
    garmentType: GarmentType | null;
    session: MeasurementSession | null;
    activePatternLabel: string | null;
    patternLink?: PatternLinkState;
    onOpenInfo: (kind: ContextInfoKind) => void;
    onChangeContext?: () => void;
}) {
    const { client, creation, garmentType, session, activePatternLabel, patternLink, onOpenInfo, onChangeContext } = props;
    const garmentName = garmentType ? GARMENT_PACKAGES[garmentType]?.name : null;
    const sessionDesc = describeSession(session);
    const patternValue =
        activePatternLabel || (patternLink === 'unlinked_versions' ? 'Sin patrón activo' : 'Patronaje pendiente');

    const renderItem = (
        kind: ContextInfoKind,
        label: string,
        value: string,
        missing: boolean,
        flex: number,
        serif?: boolean,
    ) => (
        <TouchableOpacity
            key={kind}
            testID={`context-${kind}`}
            style={[s.contextCell, { flex }]}
            onPress={() => onOpenInfo(kind)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`${label}: ${value}. Pulsa para ver el detalle`}
        >
            <Text style={s.contextLabel}>{label}</Text>
            <Text style={[s.contextValue, serif && s.contextValueClient, missing && { color: colors.textMuted }]}>{value}</Text>
        </TouchableOpacity>
    );

    return (
        <View style={s.contextBar} testID="creation-context-bar">
            <View style={s.contextRow} testID="creation-context-row-top">
                {renderItem('client', 'CLIENTA', client?.full_name || 'Clienta por seleccionar', !client, 1, true)}
                {renderItem('creation', 'CREACIÓN', creation?.name || 'Creación por seleccionar', !creation, 1.4, true)}
                {!!onChangeContext && (
                    <TouchableOpacity
                        testID="change-creation-context"
                        style={s.contextChangeBtn}
                        onPress={onChangeContext}
                        activeOpacity={0.8}
                        accessibilityRole="button"
                        accessibilityLabel="Cambiar de clienta o de creación"
                    >
                        <Text style={s.contextChangeBtnText}>⇄ Cambiar clienta / creación</Text>
                    </TouchableOpacity>
                )}
            </View>
            <View style={s.contextRowDivider} />
            <View style={s.contextRow} testID="creation-context-row-bottom">
                {renderItem('garment', 'PRENDA TÉCNICA', garmentName || 'Prenda por definir', !garmentName, 1)}
                {renderItem('session', 'SESIÓN DE MEDIDAS', sessionDesc ? `Sesión ${sessionDesc}` : 'Sesión por seleccionar', !session, 1)}
                <View style={[s.contextCell, { flex: 1 }]} testID="context-pattern">
                    <Text style={s.contextLabel}>PATRÓN</Text>
                    <Text style={[s.contextValue, { color: activePatternLabel ? colors.success : colors.bronze }]}>{patternValue}</Text>
                </View>
            </View>
        </View>
    );
}

// ------------------------------------------------------------------------------
// 2b. ENTRADA AL FLUJO C: CLIENTA → CREACIÓN → ABRIR EXPEDIENTE
// ------------------------------------------------------------------------------

/**
 * Pantalla de entrada obligatoria cuando no existe una clienta y una creación
 * elegidas de forma explícita. Reutiliza el selector canónico de clientas del
 * Flujo A y solo muestra las creaciones que pertenecen a la clienta elegida.
 */
export function CreationEntrySelector(props: {
    clients: Client[];
    loadingClients: boolean;
    selectedClient: Client | null;
    onSelectClient: (c: Client) => void;
    clientCreations: Creation[];
    loadingCreations: boolean;
    onOpenCreation: (c: Creation) => void;
    onOpenCreationsModule: () => void;
    onChangeClient: () => void;
}) {
    const {
        clients, loadingClients, selectedClient, onSelectClient, clientCreations, loadingCreations,
        onOpenCreation, onOpenCreationsModule, onChangeClient,
    } = props;
    const { width } = useWindowDimensions();
    const wide = width >= 900;
    // Salvaguarda: jamás se listan creaciones de otra clienta.
    const ownCreations = selectedClient ? clientCreations.filter((c) => c.client_id === selectedClient.id) : [];

    const stepPill = (n: string, label: string, done: boolean, current: boolean) => (
        <View key={n} style={[s.entryPill, current && s.entryPillCurrent, done && s.entryPillDone]}>
            <Text style={[s.entryPillNum, (current || done) && { color: '#FFFFFF' }]}>{done ? '✓' : n}</Text>
            <Text style={[s.entryPillText, (current || done) && { color: '#FFFFFF' }]}>{label}</Text>
        </View>
    );

    return (
        <View style={s.entryWrap} testID="creation-entry-selector">
            <View style={s.entryHeader}>
                <Text style={s.eyebrow}>✦ FLUJO C · PATRÓN PARA UNA CREACIÓN</Text>
                <Text style={s.entryTitle}>¿Con quién y en qué creación vas a trabajar?</Text>
                <Text style={s.entrySub}>
                    Elige la clienta, después una de sus creaciones y abre su expediente. El Flujo C nunca abre una clienta por defecto.
                </Text>
                <View style={s.entryPills}>
                    {stepPill('1', 'CLIENTA', !!selectedClient, !selectedClient)}
                    {stepPill('2', 'CREACIÓN', false, !!selectedClient)}
                    {stepPill('3', 'ABRIR EXPEDIENTE', false, false)}
                </View>
            </View>

            <View style={[s.entryBody, wide && { flexDirection: 'row' }]}>
                <View style={[s.entryCol, wide && { flex: 1 }]}>
                    <AtelierClientSelector
                        clients={clients}
                        selectedClient={selectedClient}
                        onSelectClient={onSelectClient}
                        loading={loadingClients}
                        showSelectedSummary={false}
                    />
                </View>
                <View style={[s.entryCol, wide && { flex: 1.5 }]}>
                    {!selectedClient ? (
                        <View style={s.unselectedClientWrap}>
                            <EmptyState
                                title="Primero elige una clienta"
                                hint="Cuando la selecciones aparecerán únicamente las creaciones que le pertenecen."
                            />
                            <View style={s.clientSatisfactionCard}>
                                <Image
                                    source={ATELIER_CLIENTS_IMAGE}
                                    style={s.clientSatisfactionImg}
                                    resizeMode="cover"
                                />
                                <View style={s.clientSatisfactionOverlay}>
                                    <View style={s.clientSatisfactionBadge}>
                                        <Text style={s.clientSatisfactionBadgeText}>EXPERIENCIA ATELIER · BY KATHERINE CARROLL</Text>
                                    </View>
                                    <Text style={s.clientSatisfactionQuote}>
                                        «La distinción de una prenda a medida: perfección anatómica y belleza atemporal.»
                                    </Text>
                                    <Text style={s.clientSatisfactionSub}>
                                        Clientas satisfechas con el arte del patronaje a medida
                                    </Text>
                                </View>
                            </View>
                        </View>
                    ) : (
                        <View>
                            <View style={s.entryCreationsHeader}>
                                <Text style={[s.sectionLabel, { flex: 1 }]}>CREACIONES DE {selectedClient.full_name.toUpperCase()}</Text>
                                <TouchableOpacity onPress={onChangeClient} accessibilityRole="button" testID="entry-change-client" style={s.linkBtn}>
                                    <Text style={s.linkBtnText}>Elegir otra clienta</Text>
                                </TouchableOpacity>
                            </View>
                            {loadingCreations ? (
                                <Text style={s.emptyHint}>Cargando creaciones…</Text>
                            ) : ownCreations.length === 0 ? (
                                <EmptyState
                                    title="Esta clienta todavía no tiene creaciones"
                                    hint="Registra la creación en el módulo de Creaciones para poder trazar su patrón."
                                />
                            ) : (
                                <View style={s.entryGrid}>
                                    {ownCreations.map((cr) => {
                                        const known = isKnownGarmentType(cr.garment_type);
                                        const img = known ? GARMENT_EDITORIAL[cr.garment_type as string] : null;
                                        const garmentLabel = known ? GARMENT_PACKAGES[cr.garment_type as GarmentType].name : 'Prenda por definir';
                                        const typeLabel = CREATION_TYPE_LABELS[cr.creation_type] || cr.creation_type;
                                        const target = formatShortDateEs(cr.target_date);
                                        return (
                                            <TouchableOpacity
                                                key={cr.id}
                                                testID={`open-creation-${cr.id}`}
                                                style={[s.entryCard, wide && { flexBasis: '48%' }]}
                                                onPress={() => onOpenCreation(cr)}
                                                activeOpacity={0.85}
                                                accessibilityRole="button"
                                                accessibilityLabel={`Abrir expediente de ${cr.name}`}
                                            >
                                                {img ? (
                                                    <View>
                                                        <Image source={img} style={s.entryCardImg} resizeMode="cover" />
                                                        <View style={s.entryRefBadge}>
                                                            <Text style={s.entryRefBadgeText}>REFERENCIA EDITORIAL · NO ES LA FOTO DE LA CREACIÓN</Text>
                                                        </View>
                                                    </View>
                                                ) : (
                                                    <View style={[s.entryCardImg, s.heroImageEmpty]}>
                                                        <Text style={s.emptyHint}>Imagen no registrada</Text>
                                                    </View>
                                                )}
                                                <View style={{ padding: 12 }}>
                                                    <Text style={s.entryCardName}>{cr.name}</Text>
                                                    <Text style={s.entryCardMeta}>{typeLabel}</Text>
                                                    <Text style={s.entryCardMeta}>Prenda: {garmentLabel}</Text>
                                                    <Text style={s.entryCardMeta}>
                                                        {CREATION_STATUS_LABELS[cr.status] || cr.status}
                                                        {target ? ` · entrega ${target}` : ' · sin fecha objetivo'}
                                                    </Text>
                                                    <Text style={[s.entryCardMeta, { color: cr.active_pattern_execution_id ? colors.success : colors.bronze, fontWeight: '700' }]}>
                                                        {cr.active_pattern_execution_id ? '✓ Patrón activo' : '○ Patronaje pendiente'}
                                                    </Text>
                                                    <View style={s.entryOpenBtn}>
                                                        <Text style={s.entryOpenBtnText}>ABRIR EXPEDIENTE →</Text>
                                                    </View>
                                                </View>
                                            </TouchableOpacity>
                                        );
                                    })}
                                </View>
                            )}
                            <TouchableOpacity onPress={onOpenCreationsModule} style={s.linkBtn} accessibilityRole="link">
                                <Text style={s.linkBtnText}>Gestionar creaciones en el módulo de Creaciones →</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
}

// ------------------------------------------------------------------------------
// 3. HOJA INFORMATIVA (clienta / creación / prenda / sesión)
// ------------------------------------------------------------------------------

export interface InfoRow {
    label: string;
    value: string;
    muted?: boolean;
}

export function InfoSheet(props: {
    visible: boolean;
    eyebrow: string;
    title: string;
    rows: InfoRow[];
    image?: any;
    onClose: () => void;
    onZoom?: () => void;
    footerNote?: string;
}) {
    const { visible, eyebrow, title, rows, image, onClose, onZoom, footerNote } = props;
    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={s.sheetOverlay}>
                <View style={s.sheet}>
                    <View style={s.sheetHeader}>
                        <View style={{ flex: 1 }}>
                            <Text style={s.eyebrow}>{eyebrow}</Text>
                            <Text style={s.sheetTitle}>{title}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose} style={s.closeBtn} accessibilityRole="button" accessibilityLabel="Cerrar">
                            <Text style={s.closeBtnText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: 8 }}>
                        {!!image && (
                            <TouchableOpacity activeOpacity={onZoom ? 0.85 : 1} onPress={onZoom} disabled={!onZoom}>
                                <Image source={image} style={s.sheetImage} resizeMode="cover" />
                            </TouchableOpacity>
                        )}
                        {rows.map((r, i) => (
                            <View key={`${r.label}_${i}`} style={s.infoRow}>
                                <Text style={s.infoLabel}>{r.label}</Text>
                                <Text style={[s.infoValue, r.muted && { color: colors.textMuted, fontStyle: 'italic' }]}>{r.value}</Text>
                            </View>
                        ))}
                        {!!footerNote && <Text style={s.footerNote}>{footerNote}</Text>}
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
}

// ------------------------------------------------------------------------------
// 4. VISOR AMPLIABLE (zoom, doble toque, pinch, arrastre, rueda)
// ------------------------------------------------------------------------------

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function ZoomableImageModal(props: { target: ZoomTarget | null; onClose: () => void }) {
    const { target, onClose } = props;
    const [t, setT] = useState({ scale: 1, x: 0, y: 0 });
    const tRef = useRef(t);
    tRef.current = t;
    const g = useRef({ startDist: 0, startScale: 1, startX: 0, startY: 0, lastTap: 0 }).current;
    const viewportRef = useRef<any>(null);

    useEffect(() => {
        setT({ scale: 1, x: 0, y: 0 });
    }, [target]);

    const zoomBy = (factor: number) =>
        setT((p) => {
            const scale = clamp(p.scale * factor, 1, 6);
            return scale === 1 ? { scale, x: 0, y: 0 } : { ...p, scale };
        });

    const responder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: () => {
                g.startScale = tRef.current.scale;
                g.startX = tRef.current.x;
                g.startY = tRef.current.y;
                g.startDist = 0;
                const now = Date.now();
                if (now - g.lastTap < 300) {
                    setT(tRef.current.scale > 1 ? { scale: 1, x: 0, y: 0 } : { scale: 2.5, x: 0, y: 0 });
                }
                g.lastTap = now;
            },
            onPanResponderMove: (e, gs) => {
                const touches: any[] = (e.nativeEvent as any).touches || [];
                if (touches.length >= 2) {
                    const dist = Math.hypot(touches[0].pageX - touches[1].pageX, touches[0].pageY - touches[1].pageY);
                    if (!g.startDist) {
                        g.startDist = dist;
                        g.startScale = tRef.current.scale;
                    }
                    const scale = clamp((g.startScale * dist) / g.startDist, 1, 6);
                    setT((p) => (scale === 1 ? { scale, x: 0, y: 0 } : { ...p, scale }));
                } else if (tRef.current.scale > 1) {
                    setT({ scale: tRef.current.scale, x: g.startX + gs.dx, y: g.startY + gs.dy });
                }
            },
        })
    ).current;

    // Rueda del ratón (solo web)
    useEffect(() => {
        if (Platform.OS !== 'web' || !target) return;
        const node: any = viewportRef.current;
        if (!node || !node.addEventListener) return;
        const onWheel = (ev: any) => {
            ev.preventDefault();
            zoomBy(ev.deltaY < 0 ? 1.15 : 1 / 1.15);
        };
        node.addEventListener('wheel', onWheel, { passive: false });
        return () => node.removeEventListener('wheel', onWheel);
    }, [target]);

    if (!target) return null;
    return (
        <Modal visible transparent animationType="fade" onRequestClose={onClose}>
            <View style={s.zoomOverlay}>
                <View style={s.zoomTopBar}>
                    <View style={{ flex: 1 }}>
                        <Text style={[s.eyebrow, { color: colors.champagneGold }]}>VISOR</Text>
                        <Text style={s.zoomTitle} numberOfLines={1}>{target.title}</Text>
                    </View>
                    <TouchableOpacity style={s.zoomBtn} onPress={() => zoomBy(1 / 1.4)} accessibilityLabel="Alejar">
                        <Text style={s.zoomBtnText}>−</Text>
                    </TouchableOpacity>
                    <Text style={s.zoomPct}>{Math.round(t.scale * 100)}%</Text>
                    <TouchableOpacity style={s.zoomBtn} onPress={() => zoomBy(1.4)} accessibilityLabel="Acercar">
                        <Text style={s.zoomBtnText}>+</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.zoomBtnWide} onPress={() => setT({ scale: 1, x: 0, y: 0 })} accessibilityLabel="Ajustar a pantalla">
                        <Text style={s.zoomBtnText}>AJUSTAR</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.zoomBtn} onPress={onClose} accessibilityLabel="Cerrar visor">
                        <Text style={s.zoomBtnText}>✕</Text>
                    </TouchableOpacity>
                </View>
                <View ref={viewportRef} style={s.zoomViewport} {...responder.panHandlers}>
                    <Image
                        source={target.source}
                        resizeMode="contain"
                        style={[
                            s.zoomImage,
                            { transform: [{ translateX: t.x }, { translateY: t.y }, { scale: t.scale }] },
                        ]}
                    />
                </View>
                <Text style={s.zoomCaption}>
                    {target.caption || 'Doble toque o rueda para ampliar · arrastra para desplazar · pellizca para acercar'}
                </Text>
            </View>
        </Modal>
    );
}

// ------------------------------------------------------------------------------
// 5. HÉROE EDITORIAL DE LA CREACIÓN
// ------------------------------------------------------------------------------

function MonogramAvatar({ name, size = 44 }: { name?: string | null; size?: number }) {
    const initials = (name || '?')
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0])
        .join('')
        .toUpperCase();
    return (
        <View style={[s.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
            <Text style={[s.avatarText, { fontSize: size * 0.36 }]}>{initials}</Text>
        </View>
    );
}

export function CreationHero(props: {
    client: Client | null;
    creation: Creation | null;
    garmentType: GarmentType | null;
    session: MeasurementSession | null;
    summary: CreationFlowSummary;
    clientCreations: Creation[];
    loadingCreations: boolean;
    onSelectCreation: (c: Creation) => void;
    onContinue: () => void;
    onSelectStage: (stage: CreationStageId) => void;
    onOpenInfo: (kind: ContextInfoKind) => void;
    onZoom: (z: ZoomTarget) => void;
    onOpenCreationsModule: () => void;
}) {
    const {
        client, creation, garmentType, session, summary, clientCreations, loadingCreations,
        onSelectCreation, onContinue, onSelectStage, onOpenInfo, onZoom, onOpenCreationsModule,
    } = props;
    const { width } = useWindowDimensions();
    const wide = width >= 900;
    const garmentName = garmentType ? GARMENT_PACKAGES[garmentType]?.name : null;
    const heroImage = garmentType ? GARMENT_EDITORIAL[garmentType] : null;
    const typeLabel = creation ? CREATION_TYPE_LABELS[creation.creation_type] || creation.creation_type : null;
    const subtitle = creation
        ? [typeLabel, creation.occasion].filter(Boolean).join(' · ')
        : '';
    const sessionLabel = describeSession(session);

    return (
        <View testID="creation-hero">
            <View style={[s.heroRow, wide && { flexDirection: 'row' }]}>
                {/* Imagen editorial */}
                <View style={[s.heroImageCol, wide && { flex: 1.15 }]}>
                    {heroImage ? (
                        <TouchableOpacity
                            activeOpacity={0.9}
                            onPress={() => onZoom({
                                source: heroImage,
                                title: garmentName || 'Referencia editorial',
                                caption: 'Referencia editorial de la prenda técnica · no es la fotografía de la creación',
                            })}
                            accessibilityRole="button"
                            accessibilityLabel="Ampliar imagen editorial de la prenda"
                        >
                            <Image source={heroImage} style={s.heroImage} resizeMode="cover" />
                            <View style={s.heroImageBadge}>
                                <Text style={s.heroImageBadgeText}>FOTOGRAFÍA EDITORIAL DE REFERENCIA · {garmentName?.toUpperCase()}</Text>
                            </View>
                            <View style={s.heroZoomHint}>
                                <Text style={s.heroZoomHintText}>⤢ Ampliar</Text>
                            </View>
                        </TouchableOpacity>
                    ) : (
                        <View style={[s.heroImage, s.heroImageEmpty]}>
                            <EmptyState title="Imagen no registrada" hint="Define la prenda técnica de la creación para ver su referencia editorial." />
                        </View>
                    )}
                    <Text style={s.heroImageNote}>
                        Fotografía de la creación: <Text style={{ fontStyle: 'italic' }}>no registrada.</Text> El módulo de Creaciones aún no almacena imágenes; se muestra la referencia editorial de la prenda.
                    </Text>
                </View>

                {/* Texto + estado */}
                <View style={[s.heroTextCol, wide && { flex: 1 }]}>
                    <Text style={s.eyebrow}>✦ PATRÓN PARA UNA CREACIÓN</Text>
                    <TouchableOpacity onPress={() => onOpenInfo('client')} activeOpacity={0.7} accessibilityRole="button" accessibilityLabel="Ver ficha de la clienta">
                        <View style={s.heroClientRow}>
                            {client && <MonogramAvatar name={client.full_name} size={48} />}
                            <Text style={s.heroClient} numberOfLines={2}>
                                {(client?.full_name || 'Selecciona una clienta').toUpperCase()}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* CREACIÓN ≠ PRENDA */}
                    <View style={s.twoConcepts}>
                        <TouchableOpacity style={[s.concept, s.conceptCreation]} onPress={() => onOpenInfo('creation')} activeOpacity={0.8}>
                            <Text style={s.conceptLabel}>CREACIÓN · LA OBRA</Text>
                            <Text style={s.conceptValueSerif} numberOfLines={2}>{creation?.name || 'Sin creación seleccionada'}</Text>
                            {!!subtitle && <Text style={s.conceptSub} numberOfLines={2}>{subtitle}</Text>}
                            {creation && (
                                <Text style={s.conceptSub}>
                                    {CREATION_STATUS_LABELS[creation.status] || creation.status}
                                    {creation.target_date ? ` · entrega ${formatShortDateEs(creation.target_date)}` : ''}
                                </Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity style={[s.concept, s.conceptGarment]} onPress={() => onOpenInfo('garment')} activeOpacity={0.8}>
                            <Text style={[s.conceptLabel, { color: colors.champagneGold }]}>PRENDA · CATEGORÍA TÉCNICA</Text>
                            <Text style={[s.conceptValueSerif, { color: '#FFFFFF' }]} numberOfLines={2}>{garmentName || 'Prenda no definida'}</Text>
                            <Text style={[s.conceptSub, { color: colors.sand }]}>
                                {garmentType ? `${GARMENT_PIECE_COUNTS[garmentType]} piezas previstas` : 'Elige la prenda en la etapa 03'}
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {/* Estado de la creación (resumen) */}
                    <View style={s.statusCard}>
                        <StatusLine label="Patronaje" value={summary.patternLink === 'active' ? 'Patrón activo' : 'Pendiente'} ok={summary.patternLink === 'active'} onPress={() => onSelectStage('pattern')} />
                        <StatusLine label="Medidas" value={session ? `${summary.anatomy.bodyCount}/${summary.anatomy.bodyTotal} corporales` : 'Seleccionar sesión'} ok={!!session && summary.anatomy.isComplete} onPress={() => onSelectStage('anatomy')} />
                        <StatusLine label="Prenda" value={garmentName || 'No definida'} ok={!!garmentName} onPress={() => onSelectStage('garment')} />
                        <StatusLine label="Sesión" value={sessionLabel || 'Seleccionar sesión anatómica'} ok={!!session} onPress={() => onOpenInfo('session')} />
                    </View>

                    <TouchableOpacity style={s.cta} onPress={onContinue} activeOpacity={0.85} testID="continue-creation" accessibilityRole="button">
                        <Text style={s.ctaText}>CONTINUAR CREACIÓN →</Text>
                        <Text style={s.ctaSub}>{summary.nextStep.title}</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Selector de creación de la clienta (solo si hay varias o ninguna) */}
            {client && (
                <View style={{ marginTop: 18 }}>
                    <Text style={s.sectionLabel}>CREACIONES DE {client.full_name.toUpperCase()}</Text>
                    {loadingCreations ? (
                        <Text style={s.emptyHint}>Cargando creaciones…</Text>
                    ) : clientCreations.length === 0 ? (
                        <EmptyState
                            title="Esta clienta todavía no tiene creaciones"
                            hint="Registra la creación en el módulo de Creaciones para poder trazar su patrón."
                        />
                    ) : (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12, paddingVertical: 6 }}>
                            {clientCreations.map((cr) => {
                                const selected = creation?.id === cr.id;
                                const img = isKnownGarmentType(cr.garment_type) ? GARMENT_EDITORIAL[cr.garment_type] : null;
                                return (
                                    <TouchableOpacity
                                        key={cr.id}
                                        testID={`creation-card-${cr.id}`}
                                        style={[s.creationCard, selected && s.creationCardActive]}
                                        onPress={() => onSelectCreation(cr)}
                                        activeOpacity={0.85}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected }}
                                    >
                                        {img ? (
                                            <Image source={img} style={s.creationCardImg} resizeMode="cover" />
                                        ) : (
                                            <View style={[s.creationCardImg, s.heroImageEmpty]}>
                                                <Text style={s.emptyHint}>Imagen no registrada</Text>
                                            </View>
                                        )}
                                        <View style={{ padding: 10 }}>
                                            <Text style={[s.creationCardName, selected && { color: '#FFFFFF' }]} numberOfLines={2}>{cr.name}</Text>
                                            <Text style={[s.creationCardMeta, selected && { color: colors.sand }]} numberOfLines={1}>
                                                {isKnownGarmentType(cr.garment_type) ? GARMENT_PACKAGES[cr.garment_type].name : 'Prenda no definida'}
                                            </Text>
                                            <Text style={[s.creationCardMeta, selected && { color: colors.champagneGold }]}>
                                                {cr.active_pattern_execution_id ? 'Patrón activo' : 'Patronaje pendiente'}
                                            </Text>
                                        </View>
                                    </TouchableOpacity>
                                );
                            })}
                        </ScrollView>
                    )}
                    <TouchableOpacity onPress={onOpenCreationsModule} style={s.linkBtn} accessibilityRole="link">
                        <Text style={s.linkBtnText}>Gestionar creaciones en el módulo de Creaciones →</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

function StatusLine(props: { label: string; value: string; ok: boolean; onPress: () => void }) {
    return (
        <TouchableOpacity style={s.statusLine} onPress={props.onPress} activeOpacity={0.7} accessibilityRole="button">
            <Text style={s.statusLabel}>{props.label}</Text>
            <Text style={[s.statusValue, { color: props.ok ? colors.success : colors.bronze }]} numberOfLines={1}>
                {props.ok ? '✓ ' : '○ '}
                {props.value}
            </Text>
        </TouchableOpacity>
    );
}

// ------------------------------------------------------------------------------
// 6. INTELIGENCIA DE CONTEXTO: listo / falta / sigue
// ------------------------------------------------------------------------------

export function ReadinessCard(props: {
    summary: CreationFlowSummary;
    onSelectStage: (stage: CreationStageId) => void;
}) {
    const { summary, onSelectStage } = props;
    const ready = summary.checklist.filter((c) => c.state === 'ok');
    const missing = summary.checklist.filter((c) => c.state !== 'ok');
    const { width } = useWindowDimensions();
    const wide = width >= 900;
    return (
        <EditorialCard eyebrow="ESTADO DE LA CREACIÓN" title={summary.isReadyToGenerate ? 'La creación está lista para iniciar el patronaje' : 'Esto es lo que ya está y lo que falta'} collapsible testID="readiness-card">
            <View style={[{ gap: 14 }, wide && { flexDirection: 'row' }]}>
                <View style={{ flex: 1 }}>
                    <Text style={[s.groupLabel, { color: colors.success }]}>✓ LO QUE YA ESTÁ LISTO</Text>
                    {ready.length === 0 && <Text style={s.emptyHint}>Aún nada está completo.</Text>}
                    {ready.map((c) => (
                        <TouchableOpacity key={c.id} style={s.checkRow} onPress={() => onSelectStage(c.stage)} activeOpacity={0.7}>
                            <Text style={[s.checkGlyph, { color: colors.success }]}>✓</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={s.checkLabel}>{c.label}</Text>
                                <Text style={s.checkDetail}>{c.detail}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[s.groupLabel, { color: colors.bronze }]}>⚠ LO QUE FALTA</Text>
                    {missing.length === 0 && <Text style={s.emptyHint}>No falta nada.</Text>}
                    {missing.map((c) => (
                        <TouchableOpacity key={c.id} style={s.checkRow} onPress={() => onSelectStage(c.stage)} activeOpacity={0.7}>
                            <Text style={[s.checkGlyph, { color: c.state === 'warn' ? colors.error : colors.textMuted }]}>{c.state === 'warn' ? '!' : '○'}</Text>
                            <View style={{ flex: 1 }}>
                                <Text style={s.checkLabel}>{c.label}</Text>
                                <Text style={s.checkDetail}>{c.detail}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                    <Text style={[s.groupLabel, { color: colors.atelierBlack, marginTop: 12 }]}>→ LO QUE SIGUE</Text>
                    <TouchableOpacity style={s.nextCard} onPress={() => onSelectStage(summary.nextStep.stage)} activeOpacity={0.85} testID="next-step">
                        <Text style={s.nextTitle}>{summary.nextStep.title}</Text>
                        <Text style={s.nextDetail}>{summary.nextStep.detail}</Text>
                        <Text style={s.nextCta}>{summary.nextStep.cta} →</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </EditorialCard>
    );
}

// ------------------------------------------------------------------------------
// 7. DIAGNÓSTICO ANATÓMICO VISUAL DE APLICABILIDAD (REQUISITOS 7 Y 8)
// ------------------------------------------------------------------------------

export function AnatomicalMeasureVisualCard(props: {
    row: GarmentMeasureRow;
    onPress: () => void;
}) {
    const { row, onPress } = props;
    const guide = getMeasurementGuide(row.code);
    const photo = guide?.photoAsset;
    const isRequired = row.requirement === 'required';
    const isNotApplicable = row.requirement === 'not_applicable';

    const isAvailable = row.state === 'registered' || (isNotApplicable && row.valueMm !== null);
    const isCalculable = row.state === 'calculable';
    const isPending = row.state === 'missing' && isRequired;

    const displayValue = row.valueMm ? mmToCm(row.valueMm) : '—';

    return (
        <TouchableOpacity
            style={[
                s.measureVisualCard,
                isAvailable && s.measureVisualCardOk,
                isCalculable && s.measureVisualCardCalc,
                isPending && s.measureVisualCardMissing,
                isNotApplicable && s.measureVisualCardNotApplicable,
            ]}
            onPress={onPress}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${row.name}: ${displayValue}. Pulsa para ver guía fotográfica y destacar en maniquí.`}
            testID={`measure-${row.code}`}
        >
            {/* Miniatura Fotográfica Anatómica Real de Alta Costura */}
            <View style={s.measureThumbWrap}>
                {photo ? (
                    <Image source={photo} style={s.measureThumbImg} resizeMode="cover" />
                ) : (
                    <View style={s.measureThumbPlaceholder}>
                        <Text style={s.measureThumbPlaceholderText}>📐</Text>
                    </View>
                )}
            </View>

            {/* Contenido Editorial */}
            <View style={s.measureVisualCardBody}>
                <View style={s.measureVisualCardTopRow}>
                    <Text style={[s.measureVisualCardValue, isPending && { color: colors.error }]}>
                        {displayValue}
                    </Text>
                    {isNotApplicable ? (
                        <View style={s.applicabilityBadgeNotApplicable}>
                            <Text style={s.applicabilityBadgeTextNotApplicable}>— No aplica</Text>
                        </View>
                    ) : isAvailable ? (
                        <View style={s.applicabilityBadgeAvailable}>
                            <Text style={s.applicabilityBadgeTextAvailable}>● Disponible</Text>
                        </View>
                    ) : isCalculable ? (
                        <View style={s.applicabilityBadgeCalculable}>
                            <Text style={s.applicabilityBadgeTextCalculable}>⚙ Por fórmula C10</Text>
                        </View>
                    ) : (
                        <View style={s.applicabilityBadgePending}>
                            <Text style={s.applicabilityBadgeTextPending}>⚠ Pendiente</Text>
                        </View>
                    )}
                </View>
                <Text style={s.measureVisualCardName} numberOfLines={2}>
                    {row.name.toUpperCase()}
                </Text>
                <Text style={s.measureVisualCardHint} numberOfLines={1}>
                    {isNotApplicable
                        ? 'No interviene en el trazado de esta prenda'
                        : isCalculable && row.formula
                        ? `Fórmula: ${row.formula}`
                        : guide?.instructions || 'Pulsa para ver dónde y cómo se toma'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export function AnatomyDiagnosisCard(props: {
    summary: CreationFlowSummary;
    diagnosis: GarmentMeasureDiagnosis | null;
    onOpenGuide: (code: string) => void;
    onGoGarment: () => void;
    onOpenSession: () => void;
}) {
    const { summary, diagnosis, onOpenGuide, onGoGarment, onOpenSession } = props;
    const a = summary.anatomy;
    const [selectedTab, setSelectedTab] = useState<'required' | 'optional' | 'notApplicable'>('required');

    const notAppList = diagnosis?.notApplicable || [];

    return (
        <EditorialCard eyebrow="DIAGNÓSTICO ANATÓMICO" title="Anatomía de la clienta y cota de corte" collapsible testID="anatomy-diagnosis">
            {!a.hasSession ? (
                <EmptyState title="Seleccionar sesión anatómica" hint="Elige una sesión de medidas en el panel de anatomía de arriba para ver su completitud." />
            ) : (
                <TouchableOpacity onPress={onOpenSession} activeOpacity={0.8} accessibilityRole="button">
                    <Text style={s.diagSession}>Sesión {a.sessionLabel}</Text>
                    <View style={s.diagBarRow}>
                        <Text style={s.diagBig}>{a.bodyCount} / {a.bodyTotal}</Text>
                        <Text style={s.diagBigSub}>medidas corporales tomadas en maniquí</Text>
                    </View>
                    <View style={s.progressTrack}>
                        <View style={[s.progressFill, { width: `${a.completenessPct}%` }]} />
                    </View>
                    <Text style={s.checkDetail}>{a.completenessPct}% de completitud anatómica · Pulsa para consultar o rectificar la sesión</Text>
                </TouchableOpacity>
            )}

            <View style={s.divider} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                <Text style={s.sectionLabel}>
                    DIAGNÓSTICO DE APLICABILIDAD{diagnosis ? ` · ${diagnosis.garmentName.toUpperCase()}` : ''}
                </Text>

                {/* Filtro interactivo de aplicabilidad */}
                {diagnosis && (
                    <View style={s.diagFilterBar}>
                        <TouchableOpacity
                            style={[s.diagFilterBtn, selectedTab === 'required' && s.diagFilterBtnActive]}
                            onPress={() => setSelectedTab('required')}
                            accessibilityRole="button"
                        >
                            <Text style={[s.diagFilterBtnText, selectedTab === 'required' && s.diagFilterBtnTextActive]}>
                                Requeridas ({diagnosis.required.length})
                            </Text>
                        </TouchableOpacity>
                        {diagnosis.optional.length > 0 && (
                            <TouchableOpacity
                                style={[s.diagFilterBtn, selectedTab === 'optional' && s.diagFilterBtnActive]}
                                onPress={() => setSelectedTab('optional')}
                                accessibilityRole="button"
                            >
                                <Text style={[s.diagFilterBtnText, selectedTab === 'optional' && s.diagFilterBtnTextActive]}>
                                    Complementarias ({diagnosis.optional.length})
                                </Text>
                            </TouchableOpacity>
                        )}
                        {notAppList.length > 0 && (
                            <TouchableOpacity
                                style={[s.diagFilterBtn, selectedTab === 'notApplicable' && s.diagFilterBtnActive]}
                                onPress={() => setSelectedTab('notApplicable')}
                                accessibilityRole="button"
                            >
                                <Text style={[s.diagFilterBtnText, selectedTab === 'notApplicable' && s.diagFilterBtnTextActive]}>
                                    No Aplica ({notAppList.length})
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                )}
            </View>

            {!diagnosis ? (
                <EmptyState title="Prenda o sesión sin definir" hint="Se necesita una prenda técnica y una sesión de medidas para calcular qué falta." />
            ) : (
                <>
                    {/* Banner de alerta si faltan cotas obligatorias */}
                    {diagnosis.missing.length > 0 && selectedTab === 'required' && (
                        <View style={s.missingBanner} testID="missing-banner">
                            <Text style={s.missingBannerTitle}>⚠ FALTAN COTAS OBLIGATORIAS PARA ESTA PRENDA</Text>
                            {diagnosis.missing.map((m) => (
                                <View key={m.code} style={s.missingRow}>
                                    <Text style={s.missingName}>{m.name}</Text>
                                    <Text style={s.missingMeta}>
                                        Código: {m.code} · Valor: No registrada · {m.canCalculate ? 'Puede calcularse por fórmula C10' : 'Requiere medición directa en la clienta'}
                                    </Text>
                                </View>
                            ))}
                            <TouchableOpacity style={s.missingAction} onPress={onGoGarment}>
                                <Text style={s.missingActionText}>Ver prenda y plantilla →</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Cuadrícula Visual de Cotas Anatómicas */}
                    <View style={s.visualCardGrid}>
                        {selectedTab === 'required' &&
                            diagnosis.required.map((r) => (
                                <AnatomicalMeasureVisualCard key={r.code} row={r} onPress={() => onOpenGuide(r.code)} />
                            ))}

                        {selectedTab === 'optional' &&
                            diagnosis.optional.map((r) => (
                                <AnatomicalMeasureVisualCard key={r.code} row={r} onPress={() => onOpenGuide(r.code)} />
                            ))}

                        {selectedTab === 'notApplicable' &&
                            notAppList.map((r) => (
                                <AnatomicalMeasureVisualCard key={r.code} row={r} onPress={() => onOpenGuide(r.code)} />
                            ))}
                    </View>

                    {diagnosis.calculableCount > 0 && selectedTab === 'required' && (
                        <Text style={[s.checkDetail, { marginTop: 10 }]}>
                            ⚙ Cotas calculadas por fórmula C10 de alta costura:{' '}
                            {diagnosis.required.filter((r) => r.state === 'calculable').map((r) => `${r.name} (${r.formula})`).join(' · ')}
                        </Text>
                    )}
                </>
            )}
        </EditorialCard>
    );
}

// ------------------------------------------------------------------------------
// 8. PRENDA DE ESTA CREACIÓN
// ------------------------------------------------------------------------------

export function CreationGarmentCard(props: {
    garmentType: GarmentType | null;
    registeredInCreation: boolean;
    generatedPieces: number | null;
    summary: CreationFlowSummary;
    onOpenInfo: () => void;
    onContinue: () => void;
    onZoom: (z: ZoomTarget) => void;
}) {
    const { garmentType, registeredInCreation, generatedPieces, summary, onOpenInfo, onContinue, onZoom } = props;
    const { width } = useWindowDimensions();
    const wide = width >= 900;
    if (!garmentType) {
        return (
            <EditorialCard eyebrow="✦ PRENDA DE ESTA CREACIÓN" title="Prenda no definida">
                <EmptyState title="La creación no registra una prenda técnica" hint="Elige una de las prendas del catálogo más abajo para ver su tarjeta y continuar al patronaje." />
            </EditorialCard>
        );
    }
    const pkg = GARMENT_PACKAGES[garmentType];
    const img = GARMENT_EDITORIAL[garmentType];
    const pieces = generatedPieces ?? GARMENT_PIECE_COUNTS[garmentType];
    return (
        <EditorialCard eyebrow="✦ PRENDA DE ESTA CREACIÓN" title={pkg.name.toUpperCase()} testID="garment-card">
            <View style={[{ gap: 16 }, wide && { flexDirection: 'row' }]}>
                <TouchableOpacity
                    style={[wide && { flex: 1.1 }]}
                    activeOpacity={0.9}
                    onPress={() => onZoom({ source: img, title: pkg.name, caption: 'Referencia editorial de la prenda técnica' })}
                    accessibilityRole="button"
                    accessibilityLabel="Ampliar fotografía de la prenda"
                >
                    <Image source={img} style={s.garmentImage} resizeMode="cover" />
                    <View style={s.heroZoomHint}><Text style={s.heroZoomHintText}>⤢ Ampliar</Text></View>
                </TouchableOpacity>
                <View style={{ flex: 1, justifyContent: 'center' }}>
                    <TouchableOpacity onPress={onOpenInfo} activeOpacity={0.7}>
                        <InfoLine k="Tipo" v={pkg.name} />
                        <InfoLine k="Piezas previstas" v={`${pieces}${generatedPieces ? ' (generadas)' : ''}`} />
                        <InfoLine k="Método" v={pkg.methodReference} />
                        <InfoLine k="Medidas obligatorias" v={`${pkg.required.length}`} />
                        <InfoLine k="Estado" v={summary.patternLink === 'active' ? 'Patrón activo' : 'Patronaje pendiente'} />
                        {!registeredInCreation && (
                            <Text style={[s.checkDetail, { color: colors.bronze }]}>
                                Esta prenda se eligió aquí; la creación no la registra todavía.
                            </Text>
                        )}
                        <Text style={s.linkBtnText}>Ver detalle de la prenda ›</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.cta, { marginTop: 14 }]} onPress={onContinue} activeOpacity={0.85} testID="garment-continue">
                        <Text style={s.ctaText}>CONTINUAR AL PATRONAJE →</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </EditorialCard>
    );
}

function InfoLine({ k, v }: { k: string; v: string }) {
    return (
        <View style={s.infoLine}>
            <Text style={s.infoLabel}>{k}</Text>
            <Text style={s.infoValue}>{v}</Text>
        </View>
    );
}

// ------------------------------------------------------------------------------
// 9. FITTING: CUADERNO DIGITAL (toile + ajustes reales)
// ------------------------------------------------------------------------------

const ZONE_ORDER: { zone: string; label: string; codes: string[] }[] = [
    { zone: 'neck', label: 'Escote', codes: ['neckline'] },
    { zone: 'shoulder', label: 'Hombro', codes: ['shoulder'] },
    { zone: 'arm', label: 'Sisa / manga', codes: ['armhole', 'sleeve', 'sleeve_cap'] },
    { zone: 'bust', label: 'Busto', codes: ['bust', 'bust_dart', 'dart'] },
    { zone: 'waist', label: 'Cintura', codes: ['waist'] },
    { zone: 'hip', label: 'Cadera', codes: ['hip', 'crotch'] },
    { zone: 'length', label: 'Largo / ruedo', codes: ['garment_length', 'length'] },
    { zone: 'other', label: 'Otras zonas', codes: ['ease', 'balance', 'custom', 'other'] },
];

function zoneOf(adj: PatternAdjustment) {
    return ZONE_ORDER.find((z) => z.codes.includes(adj.adjustment_type)) || ZONE_ORDER[ZONE_ORDER.length - 1];
}

const signedMm = (d: number) => `${d > 0 ? '+' : d < 0 ? '−' : ''}${Math.abs(Math.round(d * 10) / 10).toString().replace('.', ',')} mm`;

interface FittingPin {
    zone: string;
    label: string;
    topPct: number;
    leftPct: number;
}

const TOILE_PINS: FittingPin[] = [
    { zone: 'neck', label: 'Escote', topPct: 12, leftPct: 48 },
    { zone: 'shoulder', label: 'Hombro', topPct: 18, leftPct: 48 },
    { zone: 'arm', label: 'Sisa', topPct: 28, leftPct: 70 },
    { zone: 'bust', label: 'Busto', topPct: 38, leftPct: 48 },
    { zone: 'waist', label: 'Cintura', topPct: 54, leftPct: 48 },
    { zone: 'hip', label: 'Cadera', topPct: 68, leftPct: 48 },
    { zone: 'length', label: 'Ruedo', topPct: 88, leftPct: 48 },
];

export function CreationFittingNotebook(props: {
    adjustments: PatternAdjustment[];
    hasActivePattern: boolean;
    patternLabel: string | null;
    onZoom: (z: ZoomTarget) => void;
    onRegisterFirstTrial?: () => void;
}) {
    const { adjustments, hasActivePattern, patternLabel, onZoom, onRegisterFirstTrial } = props;
    const { width } = useWindowDimensions();
    const wide = width >= 900;
    const [activeZone, setActiveZone] = useState<string>('bust');

    const byZone = useMemo(() => {
        const map = new Map<string, { label: string; items: PatternAdjustment[] }>();
        for (const z of ZONE_ORDER) map.set(z.zone, { label: z.label, items: [] });
        for (const a of adjustments) map.get(zoneOf(a).zone)!.items.push(a);
        return map;
    }, [adjustments]);

    const activeZoneData = byZone.get(activeZone) || { label: 'Zona', items: [] };

    return (
        <EditorialCard eyebrow="✂ FITTING & AJUSTES" title="Cuaderno digital de atelier" collapsible testID="fitting-notebook">
            <View style={[{ gap: 16 }, wide && { flexDirection: 'row' }]}>
                {/* Toile interactiva con contenedor propio y pines de entalle */}
                <View style={wide ? { flex: 1.1 } : undefined}>
                    <View style={s.toileCardContainer}>
                        <TouchableOpacity
                            activeOpacity={0.92}
                            onPress={() => onZoom({ source: TOILE_IMAGE, title: 'Prueba de toile', caption: 'Fotografía de referencia: toile de muselina sobre maniquí de alta costura Stockman' })}
                            accessibilityRole="button"
                            accessibilityLabel="Ampliar fotografía de referencia de toile"
                            style={{ position: 'relative' }}
                        >
                            <Image source={TOILE_IMAGE} style={s.toileImage} resizeMode="cover" />
                            <View style={s.toileTopBadge}>
                                <Text style={s.heroImageBadgeText}>PRUEBA DE TOILE · REFERENCIA</Text>
                            </View>
                            <View style={s.heroZoomHint}>
                                <Text style={s.heroZoomHintText}>⤢ Ampliar</Text>
                            </View>

                            {/* Pines anatómicos interactivos sobre la foto */}
                            {TOILE_PINS.map((pin) => {
                                const isSelected = activeZone === pin.zone;
                                const hasItems = (byZone.get(pin.zone)?.items.length ?? 0) > 0;
                                return (
                                    <TouchableOpacity
                                        key={pin.zone}
                                        style={[
                                            s.fittingPin,
                                            { top: `${pin.topPct}%` as any, left: `${pin.leftPct}%` as any },
                                            isSelected && s.fittingPinSelected,
                                            hasItems && s.fittingPinHasNotes,
                                        ]}
                                        onPress={() => setActiveZone(pin.zone)}
                                        activeOpacity={0.85}
                                        accessibilityLabel={`Zona ${pin.label}`}
                                    >
                                        <Text style={[s.fittingPinText, isSelected && s.fittingPinTextSelected]}>
                                            {pin.label.slice(0, 1)}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </TouchableOpacity>

                        {/* Leyenda editorial legible debajo de la fotografía */}
                        <View style={s.toileLegendRow}>
                            <Text style={s.toileLegendText}>
                                Toile de muselina sobre maniquí Stockman By Katherine Carroll. Pulsa los pines o el selector de zonas para inspeccionar cada ajuste de entalle.
                            </Text>
                        </View>
                    </View>

                    {/* Selector de zonas con espacio independiente, botones completos y sin solapamiento */}
                    <View style={s.zoneSelectorCard}>
                        <Text style={s.zoneSelectorHeader}>ZONAS ANATÓMICAS DE AJUSTE (FITTING)</Text>
                        <View style={s.zonePillGrid}>
                            {ZONE_ORDER.map((z) => {
                                const count = byZone.get(z.zone)?.items.length || 0;
                                const isSelected = activeZone === z.zone;
                                return (
                                    <TouchableOpacity
                                        key={z.zone}
                                        style={[s.zonePill, isSelected && s.zonePillActive]}
                                        onPress={() => setActiveZone(z.zone)}
                                        activeOpacity={0.8}
                                        accessibilityRole="button"
                                        accessibilityLabel={`Zona de fitting ${z.label}`}
                                    >
                                        <Text style={[s.zonePillText, isSelected && s.zonePillTextActive]}>
                                            {z.label} {count > 0 ? `(${count})` : ''}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>
                </View>

                {/* Hoja de notas y registro cronológico */}
                <View style={{ flex: 1 }}>
                    <Text style={s.sectionLabel}>
                        PRUEBA 01{patternLabel ? ` · PATRÓN ${patternLabel.toUpperCase()}` : ''}
                    </Text>

                    {/* Ficha de anotación destacada de la zona activa */}
                    <View style={s.activeZoneCard}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={s.activeZoneTitle}>{activeZoneData.label.toUpperCase()}</Text>
                            <Text style={s.activeZoneBadge}>
                                {activeZoneData.items.length > 0 ? `${activeZoneData.items.length} corrección(es)` : 'Sin ajustes'}
                            </Text>
                        </View>
                        {activeZoneData.items.length === 0 ? (
                            <Text style={[s.emptyHint, { marginTop: 6 }]}>
                                No hay correcciones registradas para {activeZoneData.label.toLowerCase()} en esta prueba.
                            </Text>
                        ) : (
                            activeZoneData.items.map((adj) => (
                                <View key={adj.id} style={s.activeZoneItem}>
                                    <Text style={[s.zoneDelta, { color: adj.delta_mm >= 0 ? colors.bronze : colors.atelierBlack }]}>
                                        {adj.delta_mm >= 0 ? '↑ Entallar/Aumentar' : '↓ Reducir/Afilar'} {signedMm(adj.delta_mm)}
                                    </Text>
                                    <Text style={s.checkDetail}>
                                        {adj.target_piece || 'Prenda general'} · {formatShortDateEs(adj.fitting_date) || 'Fecha pendiente'} · {adj.recorded_by ? `Atelier ${String(adj.recorded_by).slice(0, 8)}` : 'Katherine Carroll'}
                                    </Text>
                                    {!!adj.description && <Text style={s.zoneNote}>"{adj.description}"</Text>}
                                </View>
                            ))
                        )}
                    </View>

                    {/* Estado canónico cuando no hay fitting registrado */}
                    {!hasActivePattern || adjustments.length === 0 ? (
                        <View style={s.fittingEmptyCard} testID="fitting-empty-state">
                            <Text style={s.fittingEmptyEyebrow}>CUADERNO DE ATELIER</Text>
                            <Text style={s.fittingEmptyTitle}>
                                Todavía no hay pruebas de fitting registradas para esta creación.
                            </Text>
                            <Text style={s.fittingEmptyBody}>
                                Cuando exista un patrón activo, podrás registrar la primera prueba y documentar los ajustes de la toile.
                            </Text>
                            <TouchableOpacity
                                style={[s.fittingEmptyCta, !hasActivePattern && s.fittingEmptyCtaDisabled]}
                                onPress={onRegisterFirstTrial}
                                disabled={!hasActivePattern}
                                activeOpacity={0.8}
                                accessibilityRole="button"
                                accessibilityLabel="Registrar primera prueba"
                            >
                                <Text style={[s.fittingEmptyCtaText, !hasActivePattern && s.fittingEmptyCtaTextDisabled]}>
                                    Registrar primera prueba
                                </Text>
                            </TouchableOpacity>
                            {!hasActivePattern && (
                                <Text style={s.fittingEmptyRequirementNotice}>
                                    Requiere un patrón activo generado en la Mesa CAD para registrar pruebas de fitting.
                                </Text>
                            )}
                        </View>
                    ) : (
                        <View style={[s.zoneRail, { marginTop: 12 }]} testID="fitting-zones">
                            {ZONE_ORDER.filter((z) => byZone.get(z.zone)!.items.length > 0).map((z) => (
                                <View key={z.zone} style={s.zoneRow}>
                                    <View style={s.zoneNode} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={s.zoneLabel}>{z.label}</Text>
                                        {byZone.get(z.zone)!.items.map((a) => (
                                            <View key={a.id} style={s.zoneItem}>
                                                <Text style={[s.zoneDelta, { color: a.delta_mm >= 0 ? colors.bronze : colors.atelierBlack }]}>
                                                    {a.delta_mm >= 0 ? '↑' : '↓'} {signedMm(a.delta_mm)}
                                                </Text>
                                                <Text style={s.checkDetail}>
                                                    {a.target_piece || 'Pieza no indicada'} · {formatShortDateEs(a.fitting_date) || 'Sin fecha'} · {a.recorded_by ? `usuario ${String(a.recorded_by).slice(0, 8)}` : 'responsable no registrado'}
                                                </Text>
                                                {!!a.description && <Text style={s.zoneNote}>{a.description}</Text>}
                                            </View>
                                        ))}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            </View>
        </EditorialCard>
    );
}

// ------------------------------------------------------------------------------
// 9.B. TEXTIL Y MUESTRARIO DE ALTA COSTURA
// ------------------------------------------------------------------------------

export function CreationFabricCard(props: {
    fabric: CreationFabricProfile | null;
    onZoom: (z: ZoomTarget) => void;
}) {
    const { fabric, onZoom } = props;
    if (!fabric) {
        return (
            <EditorialCard eyebrow="🧵 TEXTIL & MATERIALES" title="Muestrario de alta costura" collapsible testID="fabric-card">
                <EmptyState
                    title="Tejido pendiente de asignación"
                    hint="Los tejidos y avíos se definen durante la selección de materiales del atelier. Cuando se registren, aquí se mostrará la muestra fotográfica, composición, caída y proveedor."
                />
            </EditorialCard>
        );
    }

    const fabricImage = fabric.photoAsset || TOILE_IMAGE;

    return (
        <EditorialCard eyebrow="🧵 TEXTIL & MATERIALES" title={fabric.name} collapsible testID="fabric-card">
            <View style={s.fabricRow}>
                <TouchableOpacity
                    style={s.fabricThumbWrap}
                    onPress={() => onZoom({ source: fabricImage, title: fabric.name, caption: `${fabric.composition}${fabric.weaveType ? ` · ${fabric.weaveType}` : ''}` })}
                    activeOpacity={0.9}
                    accessibilityRole="button"
                    accessibilityLabel="Ampliar muestra textil"
                >
                    <Image source={fabricImage} style={s.fabricThumbImg} resizeMode="cover" />
                    <View style={s.heroImageBadge}><Text style={s.heroImageBadgeText}>MUESTRA REAL</Text></View>
                    <View style={s.heroZoomHint}><Text style={s.heroZoomHintText}>⤢ Ampliar</Text></View>
                </TouchableOpacity>

                <View style={s.fabricMetaCol}>
                    <InfoLine k="Composición" v={fabric.composition} />
                    <InfoLine k="Ligamento / Caída" v={fabric.weaveType || 'Ligamento artesanal'} />
                    <InfoLine k="Gramaje" v={fabric.weightGsm ? `${fabric.weightGsm} g/m²` : 'No registrado'} />
                    <InfoLine k="Ancho de pieza" v={fabric.widthCm ? `${fabric.widthCm} cm` : 'No registrado'} />
                    <InfoLine k="Color / Tono" v={fabric.color} />
                    <InfoLine k="Proveedor" v={fabric.supplier || 'No registrado'} />
                    <InfoLine k="Precio / m" v={fabric.pricePerMeter || 'Pendiente'} />
                    {!!fabric.notes && (
                        <Text style={[s.checkDetail, { marginTop: 6, fontStyle: 'italic' }]}>
                            Cuidados: {fabric.notes}
                        </Text>
                    )}
                </View>
            </View>
        </EditorialCard>
    );
}


// ------------------------------------------------------------------------------
// 10. FICHA TÉCNICA EDITORIAL
// ------------------------------------------------------------------------------

export function PieceThumbnail(props: { piece: PatternPiece }) {
    const { piece } = props;
    const b = piece.boundingBox;
    const pad = Math.max(14, Math.max(b.width, b.height) * 0.08);
    const minX = roundTo(b.minX - pad);
    const minY = roundTo(b.minY - pad);
    const width = roundTo(b.width + pad * 2);
    const height = roundTo(b.height + pad * 2);
    const cutD = pathToSvgD(piece.outlineCut);
    const seamD = pathToSvgD(piece.outlineSeam);

    if (Platform.OS === 'web') {
        return (
            <svg
                width="100%"
                height="100%"
                viewBox={`${minX} ${minY} ${width} ${height}`}
                preserveAspectRatio="xMidYMid meet"
                style={{ width: '100%', height: '100%', display: 'block' }}
            >
                <path d={cutD} fill="#FDFCFA" stroke="#171411" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                {seamD ? (
                    <path d={seamD} fill="none" stroke="#C5A880" strokeWidth="1.0" strokeDasharray="4 3" strokeLinecap="round" />
                ) : null}
                {piece.grainline ? (
                    <line
                        x1={piece.grainline.start.x}
                        y1={piece.grainline.start.y}
                        x2={piece.grainline.end.x}
                        y2={piece.grainline.end.y}
                        stroke="#8C7A6B"
                        strokeWidth="1.2"
                    />
                ) : null}
            </svg>
        );
    }

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="${minX} ${minY} ${width} ${height}"><path d="${cutD}" fill="#FDFCFA" stroke="#171411" stroke-width="1.6"/><path d="${seamD}" fill="none" stroke="#C5A880" stroke-width="1.0" stroke-dasharray="4 3"/></svg>`;
    const uri = `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
    return <Image source={{ uri }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />;
}

function pieceThumbUri(piece: PatternPiece, geometry: PatternGeometryResult): string | null {
    try {
        const b = piece.boundingBox;
        const pad = Math.max(14, Math.max(b.width, b.height) * 0.08);
        const minX = roundTo(b.minX - pad);
        const minY = roundTo(b.minY - pad);
        const width = roundTo(b.width + pad * 2);
        const height = roundTo(b.height + pad * 2);
        const cutD = pathToSvgD(piece.outlineCut);
        const seamD = pathToSvgD(piece.outlineSeam);
        const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}mm" height="${height}mm" viewBox="${minX} ${minY} ${width} ${height}"><path d="${cutD}" fill="#FDFCFA" stroke="#171411" stroke-width="1.6"/><path d="${seamD}" fill="none" stroke="#C5A880" stroke-width="1.0" stroke-dasharray="4 3"/></svg>`;
        return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
    } catch {
        return null;
    }
}

export function CreationDossierOverview(props: {
    client: Client | null;
    creation: Creation | null;
    garmentType: GarmentType | null;
    session: MeasurementSession | null;
    summary: CreationFlowSummary;
    execution: PatternExecution | null;
    geometry: PatternGeometryResult | null;
    adjustments: PatternAdjustment[];
    onOpenInfo: (kind: ContextInfoKind) => void;
    onZoom: (z: ZoomTarget) => void;
    onOpenAdjustments?: () => void;
    onApprovePattern?: () => void;
}) {
    const { client, creation, garmentType, session, summary, execution, geometry, adjustments, onOpenInfo, onZoom, onOpenAdjustments, onApprovePattern } = props;
    const { width } = useWindowDimensions();
    const cols = width >= 1100 ? 3 : width >= 700 ? 2 : 1;
    const cell = { width: cols === 1 ? '100%' : cols === 2 ? '49%' : '32.4%' } as const;
    const garmentName = garmentType ? GARMENT_PACKAGES[garmentType]?.name : null;
    const gImg = garmentType ? GARMENT_EDITORIAL[garmentType] : null;
    const vals = session?.values || {};
    const pick = (code: string) => {
        const item: any = (vals as any)[code];
        const mm = typeof item === 'number' ? item : item?.value_mm;
        return typeof mm === 'number' && mm > 0 ? mm : null;
    };
    const design = execution?.design_parameters;
    const ease = execution?.ease_profile_snapshot;
    const fabric = useMemo(() => deriveCreationFabricProfile(creation), [creation]);
    const isApproved = execution?.status === 'approved_by_designer';

    return (
        <View testID="dossier-overview">
            <Text style={s.eyebrow}>✦ DOSSIER VISUAL DE PRODUCCIÓN</Text>
            <Text style={s.dossierTitle}>{creation?.name || 'Creación sin seleccionar'}</Text>
            <Text style={s.checkDetail}>
                {execution ? `Patrón ${execution.version_label} · ${isApproved ? 'aprobado por diseñadora' : execution.status === 'pending_fitting' ? 'en prueba de vestuario' : 'en revisión'} · Snapshot C13 inmutable` : 'Patronaje pendiente · la ficha se completa al generar el patrón'}
            </Text>

            {/* Banner editorial oficial cuando el patrón está formalmente aprobado */}
            {isApproved && (
                <View style={s.approvedDossierBanner}>
                    <View style={s.approvedDossierIconWrap}>
                        <Text style={s.approvedDossierIcon}>✓</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={s.approvedDossierTitle}>✓ PATRÓN APROBADO</Text>
                        <Text style={s.approvedDossierMeta}>
                            Versión: {execution.version_label} · Aprobado: {execution.updated_at ? new Date(execution.updated_at).toLocaleString('es-ES') : new Date().toLocaleString('es-ES')} · Diseñadora: Katherine Carroll
                        </Text>
                        <Text style={s.approvedDossierStatus}>
                            Estado: LISTO PARA PRODUCCIÓN (Snapshot C13 inmutable)
                        </Text>
                    </View>
                </View>
            )}

            <View style={s.dossierGrid}>
                <View style={[s.dossierCell, cell]}>
                    <EditorialCard eyebrow="IDENTIDAD" title={creation ? creation.name : 'Sin creación'}>
                        {gImg ? (
                            <TouchableOpacity onPress={() => onZoom({ source: gImg, title: garmentName || '', caption: 'Referencia editorial de la prenda' })}>
                                <Image source={gImg} style={s.dossierImage} resizeMode="cover" />
                            </TouchableOpacity>
                        ) : (
                            <EmptyState title="Imagen no registrada" hint="Define la prenda para ver su referencia." />
                        )}
                        <InfoLine k="Tipo" v={creation ? CREATION_TYPE_LABELS[creation.creation_type] || creation.creation_type : '—'} />
                        <InfoLine k="Versión" v={execution?.version_label || '—'} />
                        <InfoLine k="Estado" v={execution ? (isApproved ? '✓ Aprobado (Producción)' : execution.status === 'pending_fitting' ? 'En fitting (Prueba)' : 'Generado (Revisión)') : (creation ? CREATION_STATUS_LABELS[creation.status] || creation.status : '—')} />
                        <InfoLine k="Diseñadora" v="Katherine Carroll" />
                        <InfoLine k="Ocasión" v={creation?.occasion || 'No registrada'} />
                        <InfoLine k="Entrega" v={formatShortDateEs(creation?.target_date) || 'No registrada'} />
                    </EditorialCard>
                </View>

                <View style={[s.dossierCell, cell]}>
                    <EditorialCard eyebrow="CLIENTA" title={client?.full_name || 'Sin clienta'}>
                        <TouchableOpacity onPress={() => onOpenInfo('client')} activeOpacity={0.75} style={s.dossierClient}>
                            <MonogramAvatar name={client?.full_name} size={56} />
                            <View style={{ flex: 1 }}>
                                <Text style={s.checkLabel}>{client?.city || 'Ciudad no registrada'}</Text>
                                <Text style={s.checkDetail}>{client?.phone || 'Teléfono no registrado'}</Text>
                                <Text style={s.checkDetail}>{client?.email || 'Email no registrado'}</Text>
                            </View>
                        </TouchableOpacity>
                        <InfoLine k="Preferencias" v={client?.style_preferences || 'No registradas'} />
                    </EditorialCard>
                </View>

                <View style={[s.dossierCell, cell]}>
                    <EditorialCard eyebrow="PRENDA" title={garmentName || 'No definida'}>
                        {gImg && <Image source={gImg} style={s.dossierImageSmall} resizeMode="cover" />}
                        {garmentType && <InfoLine k="Método" v={GARMENT_PACKAGES[garmentType].methodReference} />}
                        {garmentType && <InfoLine k="Piezas" v={`${geometry?.pieces.length ?? GARMENT_PIECE_COUNTS[garmentType]}`} />}
                        <InfoLine k="Escala" v="1:1 física (milímetros)" />
                    </EditorialCard>
                </View>

                <View style={[s.dossierCell, cell]}>
                    <EditorialCard eyebrow="MEDIDAS" title={summary.anatomy.sessionLabel ? `Sesión ${summary.anatomy.sessionLabel}` : 'Sin sesión'}>
                        <InfoLine k="Corporales" v={`${summary.anatomy.bodyCount}/${summary.anatomy.bodyTotal} (${summary.anatomy.completenessPct}%)`} />
                        <InfoLine k="Busto" v={mmToCm(pick('contorno_busto'))} />
                        <InfoLine k="Cintura" v={mmToCm(pick('contorno_cintura'))} />
                        <InfoLine k="Cadera" v={mmToCm(pick('contorno_cadera'))} />
                        <TouchableOpacity onPress={() => onOpenInfo('session')}><Text style={s.linkBtnText}>Ver todas las medidas ›</Text></TouchableOpacity>
                    </EditorialCard>
                </View>

                <View style={[s.dossierCell, cell]}>
                    <EditorialCard eyebrow="CONFECCIÓN" title="Parámetros del patrón">
                        {!execution ? (
                            <EmptyState title="Sin patrón generado" hint="Los márgenes y holguras se registran al generar el patrón." />
                        ) : (
                            <>
                                <InfoLine k="Plantilla" v={execution.template_id ? 'Plantilla Base' : (garmentType ? GARMENT_PACKAGES[garmentType]?.name : 'Base')} />
                                <InfoLine k="Margen costura" v={`${execution.seam_allowance_default_mm} mm`} />
                                <InfoLine k="Dobladillo" v={design?.hem_allowance_mm != null ? `${design.hem_allowance_mm} mm` : '40 mm'} />
                                <InfoLine k="Holgura" v={ease?.name || 'No registrada'} />
                                <InfoLine k="Motor" v={execution.engine_version} />
                            </>
                        )}
                    </EditorialCard>
                </View>

                <View style={[s.dossierCell, cell]}>
                    <EditorialCard eyebrow="MATERIALES" title={fabric ? fabric.name : 'Tejidos y avíos'}>
                        {fabric ? (
                            <TouchableOpacity
                                onPress={() => onZoom({ source: fabric.photoAsset || TOILE_IMAGE, title: fabric.name, caption: `${fabric.composition}${fabric.weaveType ? ` · ${fabric.weaveType}` : ''}` })}
                                activeOpacity={0.88}
                            >
                                <Image source={fabric.photoAsset || TOILE_IMAGE} style={s.dossierImageSmall} resizeMode="cover" />
                                <InfoLine k="Composición" v={fabric.composition} />
                                <InfoLine k="Color" v={fabric.color} />
                                <InfoLine k="Proveedor" v={fabric.supplier || 'Atelier'} />
                                <InfoLine k="Precio / m" v={fabric.pricePerMeter || 'Pendiente'} />
                            </TouchableOpacity>
                        ) : (
                            <EmptyState title="Tejido pendiente" hint="Define el tejido en la ficha de materiales para ver su muestra y proveedor." />
                        )}
                    </EditorialCard>
                </View>

                <View style={[s.dossierCell, { width: '100%' }]}>
                    <EditorialCard eyebrow="PIEZAS" title={geometry ? `${geometry.pieces.length} piezas del patrón` : 'Piezas del patrón'} collapsible>
                        {!geometry || geometry.pieces.length === 0 ? (
                            <EmptyState title="Patronaje pendiente" hint="Las piezas aparecen en cuanto se genera el patrón de la creación." />
                        ) : (
                            <View style={s.pieceGrid}>
                                {geometry.pieces.map((p) => (
                                    <View key={p.id} style={s.pieceCell}>
                                        <View style={s.pieceThumb}>
                                            <PieceThumbnail piece={p} />
                                        </View>
                                        <Text style={s.pieceName} numberOfLines={2}>{p.name}</Text>
                                        <Text style={s.pieceMeta}>
                                            ×{p.quantityToCut}{p.cutOnFold ? ' · al doblez' : ''} · {Math.round(p.boundingBox.width / 10)}×{Math.round(p.boundingBox.height / 10)} cm ({Math.round(p.boundingBox.width)}×{Math.round(p.boundingBox.height)} mm)
                                        </Text>
                                        <Text style={s.pieceDetailSub}>
                                            Costura: {p.seamAllowanceMm} mm · {p.grainline?.label || 'Aplomo'}
                                        </Text>
                                        <Text style={s.pieceDetailSub}>
                                            {p.notches?.length || 0} piquetes · ID: {p.code || p.id}
                                        </Text>
                                    </View>
                                ))}
                            </View>
                        )}
                    </EditorialCard>
                </View>

                <View style={[s.dossierCell, cell]}>
                    <EditorialCard eyebrow="AJUSTES" title="Resumen de fitting">
                        {adjustments.length === 0 ? (
                            <EmptyState title="Sin ajustes registrados" hint="Aún no se ha probado el patrón." />
                        ) : (
                            <>
                                <InfoLine k="Ajustes" v={`${adjustments.length}`} />
                                {adjustments.slice(0, 4).map((a) => (
                                    <InfoLine key={a.id} k={zoneOf(a).label} v={signedMm(a.delta_mm)} />
                                ))}
                            </>
                        )}
                        {onOpenAdjustments && !isApproved && (
                            <TouchableOpacity
                                style={s.dossierActionBtn}
                                onPress={onOpenAdjustments}
                                activeOpacity={0.85}
                            >
                                <Text style={s.dossierActionBtnText}>✂ Registrar Ajuste de Fitting</Text>
                            </TouchableOpacity>
                        )}
                    </EditorialCard>
                </View>

                <View style={[s.dossierCell, { width: cols === 1 ? '100%' : cols === 2 ? '100%' : '66.4%' }]}>
                    <EditorialCard eyebrow="CONTROL" title={`${summary.readyCount} de ${summary.checklist.length} puntos completos`}>
                        {summary.checklist.map((c) => (
                            <View key={c.id} style={s.checkRow}>
                                <Text style={[s.checkGlyph, { color: c.state === 'ok' ? colors.success : c.state === 'warn' ? colors.error : colors.textMuted }]}>
                                    {c.state === 'ok' ? '✓' : c.state === 'warn' ? '!' : '○'}
                                </Text>
                                <View style={{ flex: 1 }}>
                                    <Text style={s.checkLabel}>{c.label}</Text>
                                    <Text style={s.checkDetail}>{c.detail}</Text>
                                </View>
                            </View>
                        ))}
                    </EditorialCard>
                </View>
            </View>
        </View>
    );
}

// ------------------------------------------------------------------------------
// 11. BITÁCORA: LÍNEA DE TIEMPO Y LINAJE DE LA CREACIÓN
// ------------------------------------------------------------------------------

export function CreationTimeline(props: {
    nodes: CreationTimelineNode[];
    onSelectNode: (n: CreationTimelineNode) => void;
}) {
    const { nodes, onSelectNode } = props;
    return (
        <EditorialCard eyebrow="📜 LINAJE Y BITÁCORA" title="Genealogía de la creación y versiones C13" testID="creation-timeline">
            {nodes.length <= 1 && (
                <Text style={[s.emptyHint, { marginBottom: 8 }]}>Todavía no se ha generado ningún patrón para esta creación.</Text>
            )}
            <View style={{ paddingLeft: 6 }}>
                {nodes.map((n, i) => (
                    <View key={n.id}>
                        <TouchableOpacity
                            style={s.tlRow}
                            onPress={() => onSelectNode(n)}
                            activeOpacity={0.75}
                            testID={`timeline-${n.kind}`}
                            accessibilityRole="button"
                            accessibilityLabel={`${n.title}. Pulsa para ver el detalle`}
                        >
                            <View style={[s.tlDot, n.kind === 'fitting' && s.tlDotFitting, n.kind === 'origin' && s.tlDotOrigin, n.isActive && s.tlDotActive]} />
                            <View style={[s.tlBody, n.isActive && { borderColor: colors.champagneGold, borderWidth: 1.5 }]}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={s.tlTitle}>
                                        {n.title}
                                        {n.isActive ? '  ★ VIGENTE' : ''}
                                    </Text>
                                    {n.isImmutableSnapshot && (
                                        <View style={s.immutableBadge}>
                                            <Text style={s.immutableBadgeText}>🔒 INMUTABLE C13</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={s.checkDetail}>{n.subtitle}</Text>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 }}>
                                    <Text style={s.checkDetail}>{formatShortDateEs(n.date) || 'Sin fecha'}{n.status ? ` · ${n.status}` : ''}</Text>
                                    {n.author && <Text style={[s.checkDetail, { color: colors.bronze }]}>Autor: {n.author}</Text>}
                                    {n.parentVersionLabel && <Text style={[s.checkDetail, { fontStyle: 'italic' }]}>Derivado de {n.parentVersionLabel}</Text>}
                                </View>
                                {n.changeReason && (
                                    <Text style={[s.zoneNote, { marginTop: 4 }]}>Motivo: {n.changeReason}</Text>
                                )}
                            </View>
                        </TouchableOpacity>
                        {i < nodes.length - 1 && <View style={s.tlLine} />}
                    </View>
                ))}
            </View>
        </EditorialCard>
    );
}

// ------------------------------------------------------------------------------
// ESTILOS
// ------------------------------------------------------------------------------

const serif = typography.serif;
const sans = typography.sans;

const s = StyleSheet.create({
    // Tarjeta
    card: {
        backgroundColor: colors.surface,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 18,
        marginBottom: 16,
    },
    cardDark: { backgroundColor: colors.atelierBlack, borderColor: colors.atelierBlack },
    cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, minHeight: 44, gap: 8 },
    eyebrow: { fontFamily: sans, fontSize: 11, letterSpacing: 2.2, color: colors.champagneGold, fontWeight: '700' },
    cardTitle: { fontFamily: serif, fontSize: 21, color: colors.atelierBlack, marginTop: 3 },
    chevron: { fontSize: 18, color: colors.bronze, paddingHorizontal: 8 },
    sectionLabel: { fontFamily: sans, fontSize: 11, letterSpacing: 1.8, color: colors.bronze, fontWeight: '700', marginBottom: 8, marginTop: 4 },
    groupLabel: { fontFamily: sans, fontSize: 11, letterSpacing: 1.6, fontWeight: '800', marginBottom: 8 },
    divider: { height: 1, backgroundColor: colors.sand, marginVertical: 16 },
    // Vacíos
    empty: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.sand, borderRadius: 12, padding: 16, backgroundColor: colors.surfaceSubtle },
    emptyTitle: { fontFamily: serif, fontSize: 16, color: colors.atelierBlack, marginBottom: 4 },
    emptyHint: { fontFamily: sans, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    // Stepper (único mecanismo de navegación principal)
    stepperWrap: { marginBottom: 14 },
    stepperTitle: { fontFamily: serif, fontSize: 22, color: colors.atelierBlack, marginBottom: 10 },
    stepperGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    stepTile: {
        flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 58, minWidth: 0,
        paddingHorizontal: 8, paddingVertical: 8, borderRadius: 12,
        borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.surface,
    },
    stepTileCompact: { paddingHorizontal: 6, gap: 6 },
    stepTileActive: { backgroundColor: colors.atelierBlack, borderColor: colors.atelierBlack },
    stepTileBlocked: { opacity: 0.7, backgroundColor: colors.surfaceSubtle, borderStyle: 'dashed' },
    stepNum: { width: 30, height: 30, borderRadius: 15, borderWidth: 1.5, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
    stepNumDone: { backgroundColor: colors.success, borderColor: colors.success },
    stepNumAttention: { backgroundColor: colors.bronze, borderColor: colors.bronze },
    stepNumActive: { backgroundColor: colors.champagneGold, borderColor: colors.champagneGold },
    stepNumText: { fontFamily: sans, fontSize: 11, fontWeight: '800', color: colors.textSecondary },
    stepName: { fontFamily: sans, fontSize: 12, fontWeight: '800', color: colors.atelierBlack },
    stepStatus: { fontFamily: sans, fontSize: 10, color: colors.textSecondary, marginTop: 1 },
    stepperActiveNote: { marginTop: 8, paddingHorizontal: 4 },
    stepperActiveNoteText: { fontFamily: sans, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    // Contexto (dos filas compactas, sin truncar)
    contextBar: {
        backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.sand,
        borderRadius: 12, paddingHorizontal: 6, paddingVertical: 4, marginBottom: 12,
    },
    contextRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'stretch', gap: 4 },
    contextRowDivider: { height: 1, backgroundColor: colors.sand, marginHorizontal: 10 },
    contextCell: { minWidth: 160, paddingHorizontal: 10, paddingVertical: 6, justifyContent: 'center', minHeight: 48 },
    contextChangeBtn: {
        alignSelf: 'center', minHeight: 44, paddingHorizontal: 14, justifyContent: 'center',
        borderRadius: 999, borderWidth: 1, borderColor: colors.champagneGold, backgroundColor: colors.ivoryWarm,
    },
    contextChangeBtnText: { fontFamily: sans, fontSize: 12, fontWeight: '800', letterSpacing: 0.6, color: colors.bronze },
    contextLabel: { fontFamily: sans, fontSize: 10, letterSpacing: 1.6, color: colors.champagneGold, fontWeight: '800' },
    contextValue: { fontFamily: sans, fontSize: 14, color: colors.atelierBlack, fontWeight: '600', marginTop: 2 },
    contextValueClient: { fontFamily: serif, fontSize: 17, letterSpacing: 0.6 },
    // Entrada al Flujo C (clienta → creación → expediente)
    entryWrap: { gap: 14, marginBottom: 16 },
    entryHeader: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.sand, borderRadius: 16, padding: 18, gap: 6 },
    entryTitle: { fontFamily: serif, fontSize: 26, color: colors.atelierBlack },
    entrySub: { fontFamily: sans, fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    entryPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
    entryPill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, minHeight: 36, borderRadius: 999, borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.surfaceSubtle },
    entryPillCurrent: { backgroundColor: colors.atelierBlack, borderColor: colors.atelierBlack },
    entryPillDone: { backgroundColor: colors.success, borderColor: colors.success },
    entryPillNum: { fontFamily: sans, fontSize: 12, fontWeight: '800', color: colors.textSecondary },
    entryPillText: { fontFamily: sans, fontSize: 11, fontWeight: '800', letterSpacing: 1.2, color: colors.textSecondary },
    entryBody: { gap: 14 },
    entryCol: { gap: 12 },
    entryCreationsHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
    entryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    entryCard: { flexGrow: 1, flexBasis: '100%', borderRadius: 14, borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.surface, overflow: 'hidden' },
    entryCardImg: { width: '100%', height: 150, backgroundColor: colors.sand },
    entryRefBadge: { position: 'absolute', left: 8, bottom: 8, right: 8, backgroundColor: 'rgba(23,20,17,0.78)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
    entryRefBadgeText: { color: '#FFFFFF', fontFamily: sans, fontSize: 9, letterSpacing: 1.1, fontWeight: '700' },
    entryCardName: { fontFamily: serif, fontSize: 19, color: colors.atelierBlack, marginBottom: 4 },
    entryCardMeta: { fontFamily: sans, fontSize: 13, color: colors.textSecondary, lineHeight: 19 },
    entryOpenBtn: { marginTop: 10, minHeight: 44, borderRadius: 10, backgroundColor: colors.atelierBlack, alignItems: 'center', justifyContent: 'center' },
    entryOpenBtnText: { fontFamily: sans, fontSize: 12, fontWeight: '800', letterSpacing: 1.4, color: '#FFFFFF' },
    // Hoja de info
    sheetOverlay: { flex: 1, backgroundColor: 'rgba(23,20,17,0.55)', alignItems: 'center', justifyContent: 'center', padding: 18 },
    sheet: { width: '100%', maxWidth: 560, backgroundColor: colors.ivoryWarm, borderRadius: 16, padding: 20, borderWidth: 1, borderColor: colors.sand },
    sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
    sheetTitle: { fontFamily: serif, fontSize: 24, color: colors.atelierBlack, marginTop: 4 },
    sheetImage: { width: '100%', height: 220, borderRadius: 12, marginBottom: 12 },
    closeBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    closeBtnText: { fontSize: 18, color: colors.atelierBlack },
    infoRow: { paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: colors.sand },
    infoLine: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: colors.sand },
    infoLabel: { fontFamily: sans, fontSize: 11, letterSpacing: 1.2, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },
    infoValue: { fontFamily: sans, fontSize: 14, color: colors.atelierBlack, flexShrink: 1, textAlign: 'right' },
    footerNote: { fontFamily: sans, fontSize: 12, color: colors.textSecondary, marginTop: 10, lineHeight: 18 },
    // Zoom
    zoomOverlay: { flex: 1, backgroundColor: 'rgba(15,12,10,0.96)' },
    zoomTopBar: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, paddingTop: 18 },
    zoomTitle: { fontFamily: serif, fontSize: 18, color: '#FFFFFF' },
    zoomBtn: { minWidth: 44, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.bronze, alignItems: 'center', justifyContent: 'center' },
    zoomBtnWide: { paddingHorizontal: 12, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.bronze, alignItems: 'center', justifyContent: 'center' },
    zoomBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700', fontFamily: sans },
    zoomPct: { color: colors.sand, fontFamily: sans, fontSize: 12, minWidth: 42, textAlign: 'center' },
    zoomViewport: { flex: 1, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    zoomImage: { width: '100%', height: '100%' },
    zoomCaption: { color: colors.sand, fontFamily: sans, fontSize: 12, textAlign: 'center', padding: 12 },
    // Hero
    heroRow: { gap: 20 },
    heroImageCol: { gap: 8 },
    heroImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: colors.sand },
    heroImageEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.sand },
    heroImageBadge: { position: 'absolute', left: 14, bottom: 14, backgroundColor: 'rgba(23,20,17,0.78)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    heroImageBadgeText: { color: '#FFFFFF', fontFamily: sans, fontSize: 10, letterSpacing: 1.6, fontWeight: '700' },
    heroZoomHint: { position: 'absolute', right: 14, top: 14, backgroundColor: 'rgba(248,242,233,0.9)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
    heroZoomHintText: { fontFamily: sans, fontSize: 11, color: colors.atelierBlack, fontWeight: '700' },
    heroImageNote: { fontFamily: sans, fontSize: 12, color: colors.textSecondary, lineHeight: 17 },
    heroTextCol: { gap: 12, justifyContent: 'center' },
    heroClientRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 48 },
    heroClient: { fontFamily: serif, fontSize: 32, letterSpacing: 2.4, color: colors.atelierBlack, flex: 1 },
    avatar: { backgroundColor: colors.atelierBlack, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.champagneGold },
    avatarText: { color: colors.champagneGold, fontFamily: serif, fontWeight: '700', letterSpacing: 1 },
    twoConcepts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    concept: { flex: 1, minWidth: 190, borderRadius: 14, padding: 14, minHeight: 104 },
    conceptCreation: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.champagneGold },
    conceptGarment: { backgroundColor: colors.atelierBlack },
    conceptLabel: { fontFamily: sans, fontSize: 10, letterSpacing: 1.6, color: colors.bronze, fontWeight: '800' },
    conceptValueSerif: { fontFamily: serif, fontSize: 21, color: colors.atelierBlack, marginTop: 6 },
    conceptSub: { fontFamily: sans, fontSize: 12, color: colors.textSecondary, marginTop: 4 },
    statusCard: { backgroundColor: colors.surfaceSubtle, borderRadius: 12, padding: 6, borderWidth: 1, borderColor: colors.sand },
    statusLine: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingHorizontal: 10, minHeight: 40 },
    statusLabel: { fontFamily: sans, fontSize: 12, letterSpacing: 1, color: colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' },
    statusValue: { fontFamily: sans, fontSize: 14, fontWeight: '700', flexShrink: 1, textAlign: 'right' },
    cta: { backgroundColor: colors.atelierBlack, borderRadius: 12, paddingVertical: 15, paddingHorizontal: 20, alignItems: 'center', minHeight: 56, justifyContent: 'center', borderWidth: 1, borderColor: colors.champagneGold },
    ctaText: { color: '#FFFFFF', fontFamily: sans, fontSize: 14, letterSpacing: 2, fontWeight: '800' },
    ctaSub: { color: colors.champagneGold, fontFamily: sans, fontSize: 12, marginTop: 3 },
    linkBtn: { minHeight: 44, justifyContent: 'center' },
    linkBtnText: { fontFamily: sans, fontSize: 13, color: colors.bronze, fontWeight: '700', marginTop: 8 },
    creationCard: { width: 220, borderRadius: 14, overflow: 'hidden', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.sand },
    creationCardActive: { backgroundColor: colors.atelierBlack, borderColor: colors.champagneGold, borderWidth: 2 },
    creationCardImg: { width: '100%', height: 110 },
    creationCardName: { fontFamily: serif, fontSize: 16, color: colors.atelierBlack },
    creationCardMeta: { fontFamily: sans, fontSize: 12, color: colors.textSecondary, marginTop: 3 },
    // Checklist
    checkRow: { flexDirection: 'row', gap: 10, paddingVertical: 8, minHeight: 44, alignItems: 'flex-start' },
    checkGlyph: { fontFamily: sans, fontSize: 16, fontWeight: '800', width: 18, textAlign: 'center' },
    checkLabel: { fontFamily: sans, fontSize: 14, color: colors.atelierBlack, fontWeight: '700' },
    checkDetail: { fontFamily: sans, fontSize: 12, color: colors.textSecondary, lineHeight: 18, marginTop: 1 },
    nextCard: { backgroundColor: colors.atelierBlack, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: colors.champagneGold },
    nextTitle: { fontFamily: serif, fontSize: 18, color: '#FFFFFF' },
    nextDetail: { fontFamily: sans, fontSize: 12, color: colors.sand, marginTop: 4, lineHeight: 18 },
    nextCta: { fontFamily: sans, fontSize: 12, letterSpacing: 1.6, color: colors.champagneGold, fontWeight: '800', marginTop: 10 },
    // Diagnóstico
    diagSession: { fontFamily: serif, fontSize: 18, color: colors.atelierBlack },
    diagBarRow: { flexDirection: 'row', alignItems: 'baseline', gap: 10, marginTop: 6 },
    diagBig: { fontFamily: serif, fontSize: 34, color: colors.atelierBlack },
    diagBigSub: { fontFamily: sans, fontSize: 13, color: colors.textSecondary },
    progressTrack: { height: 8, backgroundColor: colors.sand, borderRadius: 4, overflow: 'hidden', marginVertical: 8 },
    progressFill: { height: 8, backgroundColor: colors.champagneGold },
    missingBanner: { backgroundColor: colors.errorBg, borderColor: colors.errorBorder, borderWidth: 1, borderRadius: 12, padding: 14, marginBottom: 12 },
    missingBannerTitle: { fontFamily: sans, fontSize: 12, letterSpacing: 1.4, color: colors.error, fontWeight: '800', marginBottom: 8 },
    missingRow: { paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.errorBorder },
    missingName: { fontFamily: sans, fontSize: 14, fontWeight: '700', color: colors.atelierBlack },
    missingMeta: { fontFamily: sans, fontSize: 12, color: colors.textSecondary, marginTop: 2, lineHeight: 17 },
    missingAction: { minHeight: 44, justifyContent: 'center' },
    missingActionText: { fontFamily: sans, fontSize: 13, color: colors.error, fontWeight: '800' },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    measureChip: { flexDirection: 'row', gap: 8, alignItems: 'center', minWidth: 190, flexGrow: 1, flexBasis: '30%', minHeight: 52, borderWidth: 1, borderColor: colors.sand, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: colors.surface },
    measureChipOk: { backgroundColor: colors.successBg, borderColor: colors.successBorder },
    measureChipCalc: { backgroundColor: colors.surfaceSubtle, borderColor: colors.champagneGold },
    measureChipMissing: { backgroundColor: colors.errorBg, borderColor: colors.errorBorder },
    measureChipGlyph: { fontFamily: sans, fontSize: 16, fontWeight: '800', width: 18, textAlign: 'center' },
    measureChipName: { fontFamily: sans, fontSize: 13, color: colors.atelierBlack, fontWeight: '600' },
    measureChipValue: { fontFamily: sans, fontSize: 12, color: colors.textSecondary, marginTop: 1 },
    // Prenda / fitting
    garmentImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 14 },
    toileImage: { width: '100%', aspectRatio: 4 / 3, borderRadius: 14 },
    zoneRail: { borderLeftWidth: 2, borderLeftColor: colors.champagneGold, marginLeft: 8, paddingLeft: 14 },
    zoneRow: { flexDirection: 'row', gap: 8, paddingVertical: 8 },
    zoneNode: { position: 'absolute', left: -21, top: 14, width: 12, height: 12, borderRadius: 6, backgroundColor: colors.champagneGold },
    zoneLabel: { fontFamily: serif, fontSize: 16, color: colors.atelierBlack },
    zoneItem: { marginTop: 6 },
    zoneDelta: { fontFamily: sans, fontSize: 18, fontWeight: '800' },
    zoneNote: { fontFamily: sans, fontSize: 13, color: colors.atelierBlack, fontStyle: 'italic', marginTop: 2 },
    // Ficha
    dossierTitle: { fontFamily: serif, fontSize: 32, color: colors.atelierBlack, marginTop: 4 },
    dossierGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginTop: 14 },
    dossierCell: {},
    dossierImage: { width: '100%', height: 170, borderRadius: 10, marginBottom: 10 },
    dossierImageSmall: { width: '100%', height: 130, borderRadius: 10, marginBottom: 10 },
    dossierClient: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
    pieceGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    pieceCell: { width: 150 },
    pieceThumb: { width: 150, height: 120, borderRadius: 10, borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.ivoryWarm, alignItems: 'center', justifyContent: 'center', padding: 4 },
    pieceName: { fontFamily: sans, fontSize: 12, fontWeight: '700', color: colors.atelierBlack, marginTop: 6 },
    pieceMeta: { fontFamily: sans, fontSize: 11, color: colors.textSecondary },
    // Timeline
    tlRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 56 },
    tlDot: { width: 16, height: 16, borderRadius: 8, backgroundColor: colors.atelierBlack, marginTop: 14, borderWidth: 3, borderColor: colors.ivoryWarm },
    tlDotOrigin: { backgroundColor: colors.bronze },
    tlDotFitting: { backgroundColor: colors.champagneGold },
    tlDotActive: { backgroundColor: colors.success },
    tlBody: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.sand, borderRadius: 12, padding: 12 },
    tlTitle: { fontFamily: serif, fontSize: 17, color: colors.atelierBlack },
    tlLine: { width: 2, height: 14, backgroundColor: colors.sand, marginLeft: 7 },
    immutableBadge: { backgroundColor: colors.surfaceSubtle, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: colors.sand },
    immutableBadgeText: { fontFamily: sans, fontSize: 10, letterSpacing: 1.2, fontWeight: '700', color: colors.bronze },

    // Filtros de diagnóstico anatómico
    diagFilterBar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    diagFilterBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.surface, minHeight: 36, justifyContent: 'center' },
    diagFilterBtnActive: { backgroundColor: colors.atelierBlack, borderColor: colors.champagneGold },
    diagFilterBtnText: { fontFamily: sans, fontSize: 11, letterSpacing: 1.2, fontWeight: '700', color: colors.textSecondary },
    diagFilterBtnTextActive: { color: colors.champagneGold },

    // Tarjeta visual anatómica
    visualCardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 8 },
    measureVisualCard: { flexDirection: 'row', gap: 10, alignItems: 'center', minWidth: 200, flexGrow: 1, flexBasis: '30%', minHeight: 64, borderWidth: 1, borderColor: colors.sand, borderRadius: 12, padding: 8, backgroundColor: colors.surface },
    measureVisualCardOk: { borderColor: colors.successBorder, backgroundColor: colors.surface },
    measureVisualCardCalc: { borderColor: colors.champagneGold, backgroundColor: colors.surfaceSubtle },
    measureVisualCardMissing: { borderColor: colors.errorBorder, backgroundColor: colors.errorBg },
    measureVisualCardNotApplicable: { borderColor: colors.sand, opacity: 0.72, backgroundColor: colors.surfaceSubtle },
    measureVisualCardBody: { flex: 1, justifyContent: 'center' },
    measureVisualCardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 6, marginBottom: 2 },
    measureVisualCardValue: { fontFamily: serif, fontSize: 16, color: colors.atelierBlack, fontWeight: '700' },
    measureVisualCardName: { fontFamily: sans, fontSize: 11, letterSpacing: 1, fontWeight: '700', color: colors.atelierBlack },
    measureVisualCardHint: { fontFamily: sans, fontSize: 10, color: colors.textSecondary, marginTop: 1 },
    measureThumbWrap: { width: 48, height: 48, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.ivoryWarm, borderWidth: 1, borderColor: colors.sand, alignItems: 'center', justifyContent: 'center' },
    measureThumbImg: { width: '100%', height: '100%' },
    measureThumbPlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceSubtle },
    measureThumbPlaceholderText: { fontFamily: serif, fontSize: 14, color: colors.bronze },
    applicabilityBadgeAvailable: { backgroundColor: colors.successBg, borderColor: colors.successBorder, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    applicabilityBadgeTextAvailable: { fontFamily: sans, fontSize: 9, fontWeight: '700', color: colors.success },
    applicabilityBadgeCalculable: { backgroundColor: colors.surfaceSubtle, borderColor: colors.champagneGold, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    applicabilityBadgeTextCalculable: { fontFamily: sans, fontSize: 9, fontWeight: '700', color: colors.bronze },
    applicabilityBadgePending: { backgroundColor: colors.errorBg, borderColor: colors.errorBorder, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
    applicabilityBadgeTextPending: { fontFamily: sans, fontSize: 9, fontWeight: '700', color: colors.error },
    applicabilityBadgeNotApplicable: { backgroundColor: colors.surfaceSubtle, borderColor: colors.sand, borderWidth: 1, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, opacity: 0.75 },
    applicabilityBadgeTextNotApplicable: { fontFamily: sans, fontSize: 9, fontWeight: '600', color: colors.textSecondary },


    // Pines de fitting interactivos
    fittingPin: { position: 'absolute', width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(23,20,17,0.75)', borderWidth: 1.5, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', marginLeft: -14, marginTop: -14 },
    fittingPinSelected: { backgroundColor: colors.champagneGold, borderColor: colors.atelierBlack, transform: [{ scale: 1.2 }] },
    fittingPinHasNotes: { borderColor: colors.champagneGold, borderWidth: 2 },
    fittingPinText: { color: '#FFFFFF', fontFamily: sans, fontSize: 11, fontWeight: '800' },
    fittingPinTextSelected: { color: colors.atelierBlack },
    zonePillRail: { gap: 8, paddingVertical: 10 },
    zonePill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.surface, minHeight: 36, justifyContent: 'center' },
    zonePillActive: { backgroundColor: colors.atelierBlack, borderColor: colors.champagneGold },
    zonePillText: { fontFamily: sans, fontSize: 11, letterSpacing: 1, fontWeight: '700', color: colors.atelierBlack },
    zonePillTextActive: { color: colors.champagneGold },
    activeZoneCard: { backgroundColor: colors.surfaceSubtle, borderRadius: 12, borderWidth: 1, borderColor: colors.sand, padding: 12, marginBottom: 12 },
    activeZoneTitle: { fontFamily: sans, fontSize: 11, letterSpacing: 1.8, color: colors.bronze, fontWeight: '800' },
    activeZoneBadge: { fontFamily: sans, fontSize: 11, color: colors.textSecondary },
    activeZoneItem: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.sand },

    // Contenedores independientes y accesibles de fitting de alta costura
    toileCardContainer: { borderRadius: 14, overflow: 'hidden', borderWidth: 1, borderColor: colors.sand, backgroundColor: colors.surface },
    toileTopBadge: { position: 'absolute', left: 14, top: 14, backgroundColor: 'rgba(23,20,17,0.85)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    toileLegendRow: { paddingHorizontal: 14, paddingVertical: 10, backgroundColor: colors.surfaceSubtle, borderTopWidth: 1, borderTopColor: colors.sand },
    toileLegendText: { fontFamily: sans, fontSize: 11, color: colors.textSecondary, lineHeight: 16 },
    zoneSelectorCard: { backgroundColor: colors.surfaceSubtle, borderRadius: 14, borderWidth: 1, borderColor: colors.sand, padding: 12, marginTop: 12 },
    zoneSelectorHeader: { fontFamily: sans, fontSize: 10, letterSpacing: 1.6, color: colors.bronze, fontWeight: '800', marginBottom: 8 },
    zonePillGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    fittingEmptyCard: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.sand, borderRadius: 14, padding: 20, backgroundColor: colors.surfaceSubtle, marginTop: 8 },
    fittingEmptyEyebrow: { fontFamily: sans, fontSize: 10, letterSpacing: 1.8, color: colors.champagneGold, fontWeight: '800', marginBottom: 6 },
    fittingEmptyTitle: { fontFamily: serif, fontSize: 18, color: colors.atelierBlack, marginBottom: 8, lineHeight: 24 },
    fittingEmptyBody: { fontFamily: sans, fontSize: 13, color: colors.textSecondary, lineHeight: 19, marginBottom: 16 },
    fittingEmptyCta: { backgroundColor: colors.atelierBlack, paddingHorizontal: 18, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.champagneGold, alignSelf: 'flex-start' },
    fittingEmptyCtaDisabled: { backgroundColor: colors.sand, borderColor: colors.sand, opacity: 0.6 },
    fittingEmptyCtaText: { color: colors.ivoryWarm, fontFamily: sans, fontSize: 12, fontWeight: '700', letterSpacing: 1 },
    fittingEmptyCtaTextDisabled: { color: colors.textSecondary },
    fittingEmptyRequirementNotice: { fontFamily: sans, fontSize: 11, color: colors.bronze, marginTop: 10, fontStyle: 'italic' },

    // Ficha Textil
    fabricRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
    fabricThumbWrap: { width: 140, height: 160, borderRadius: 12, overflow: 'hidden', borderWidth: 1, borderColor: colors.sand, position: 'relative' },
    fabricThumbImg: { width: '100%', height: '100%' },
    fabricMetaCol: { flex: 1, minWidth: 200, gap: 2 },

    // Clientas Satisfechas (Editorial Flujo C)
    unselectedClientWrap: { gap: 14 },
    clientSatisfactionCard: {
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: colors.surface,
        position: 'relative',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 3,
    },
    clientSatisfactionImg: {
        width: '100%',
        height: 280,
        backgroundColor: colors.sand,
    },
    clientSatisfactionOverlay: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(23, 20, 17, 0.78)',
        padding: 16,
        gap: 6,
    },
    clientSatisfactionBadge: {
        alignSelf: 'flex-start',
        backgroundColor: colors.champagneGold,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    clientSatisfactionBadgeText: {
        fontFamily: sans,
        fontSize: 9,
        letterSpacing: 1.4,
        fontWeight: '800',
        color: colors.atelierBlack,
    },
    clientSatisfactionQuote: {
        fontFamily: serif,
        fontSize: 14,
        color: '#FFFFFF',
        fontStyle: 'italic',
        lineHeight: 20,
    },
    clientSatisfactionSub: {
        fontFamily: sans,
        fontSize: 11,
        color: colors.sand,
        letterSpacing: 0.5,
    },
    // Banner de Patrón Aprobado en Dossier
    approvedDossierBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
        backgroundColor: '#F3FAF4',
        borderWidth: 1.5,
        borderColor: colors.success,
        borderRadius: 14,
        padding: 16,
        marginTop: 14,
        marginBottom: 6,
    },
    approvedDossierIconWrap: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.success,
        alignItems: 'center',
        justifyContent: 'center',
    },
    approvedDossierIcon: {
        color: '#FFFFFF',
        fontFamily: sans,
        fontSize: 22,
        fontWeight: '900',
    },
    approvedDossierTitle: {
        fontFamily: sans,
        fontSize: 16,
        letterSpacing: 1.2,
        fontWeight: '900',
        color: '#0F5132',
    },
    approvedDossierMeta: {
        fontFamily: sans,
        fontSize: 12,
        color: colors.atelierBlack,
        marginTop: 2,
    },
    approvedDossierStatus: {
        fontFamily: sans,
        fontSize: 11,
        fontWeight: '700',
        color: '#0F5132',
        letterSpacing: 0.8,
        marginTop: 3,
    },
    pieceDetailSub: {
        fontFamily: sans,
        fontSize: 10,
        color: colors.textSecondary,
        marginTop: 2,
    },
    dossierActionBtn: {
        marginTop: 12,
        paddingHorizontal: 14,
        paddingVertical: 10,
        backgroundColor: colors.atelierBlack,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.champagneGold,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dossierActionBtnText: {
        fontFamily: sans,
        fontSize: 11,
        fontWeight: '700',
        color: colors.ivoryWarm,
        letterSpacing: 0.8,
    },
});


