// ==============================================================================
// COMPONENTE: PESTAÑA DE PATRONES & LINAJE INMUTABLE (ALTA COSTURA)
// Archivo: src/components/clients/dossier/DossierPatternsTab.tsx
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React, { useState } from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { Client } from '../../../types/client';
import { Creation } from '../../../types/creation';
import { MeasurementSession } from '../../../types/pattern/measurement';
import { GarmentType, PatternExecution, PatternStatus } from '../../../types/pattern/pattern';
import { ConceptualPatternGroup } from '../../../utils/clientPatternLineageHelper';
import { styles } from './clientDossierStyles';

interface DossierPatternsTabProps {
    client: Client;
    patternGroups: ConceptualPatternGroup[];
    displayedPatterns: PatternExecution[];
    filterSessionId: string | null;
    creationMap: Map<string, Creation>;
    sessionMap: Map<string, MeasurementSession>;
    getStatusStyle: (status: PatternStatus) => { label: string; bg: string; color: string; border: string };
    getPatternGarmentPhoto: (garmentType: string, creation?: Creation | null) => any;
    getGarmentLabel: (type: string) => string;
    formatDate: (dateStr?: string | null) => string;
    onClearFilterSession: () => void;
    onInspectPattern: (p: PatternExecution) => void;
    onOpenCad?: (params: {
        clientId: string;
        sessionId?: string | null;
        creationId?: string | null;
        garmentType?: GarmentType | null;
        executionId?: string | null;
    }) => void;
}

export const DossierPatternsTab: React.FC<DossierPatternsTabProps> = ({
    client,
    patternGroups,
    displayedPatterns,
    filterSessionId,
    creationMap,
    sessionMap,
    getStatusStyle,
    getPatternGarmentPhoto,
    getGarmentLabel,
    formatDate,
    onClearFilterSession,
    onInspectPattern,
    onOpenCad,
}) => {
    const [expandedHistoryGroupIds, setExpandedHistoryGroupIds] = useState<Record<string, boolean>>({});

    return (
        <View style={styles.tabContentSection}>
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>
                    DIRECTORIO DE PATRONES & LINAJE ({patternGroups.length} Patrón CAD · {displayedPatterns.length} Ejecuciones Técnicas)
                </Text>
                <Text style={styles.sectionHeaderSubtitle}>
                    Estructura Genealógica Inmutable: Patrón Conceptual → Creación → Versiones Derivadas → Patrón Vigente.
                </Text>
            </View>

            {/* Chip informativo de filtro si se activó desde una sesión */}
            {filterSessionId && (
                <View style={styles.filterAlertBar}>
                    <Text style={styles.filterAlertText}>
                        Filtrando patrones derivados de Sesión #{filterSessionId.slice(0, 8)}... ({displayedPatterns.length} ejecuciones)
                    </Text>
                    <TouchableOpacity
                        onPress={onClearFilterSession}
                        style={styles.filterAlertClearBtn}
                        activeOpacity={0.8}
                    >
                        <Text style={styles.filterAlertClearText}>✕ Ver todos los patrones</Text>
                    </TouchableOpacity>
                </View>
            )}

            {patternGroups.length === 0 ? (
                <View style={styles.emptyBox}>
                    <Text style={styles.emptyBoxText}>
                        {filterSessionId
                            ? 'Esta sesión de medidas no tiene patrones derivados asociados.'
                            : 'Esta clienta aún no tiene ejecuciones de patronaje generadas.'}
                    </Text>
                    {filterSessionId && (
                        <TouchableOpacity
                            onPress={onClearFilterSession}
                            style={[styles.cardActionSecondary, { marginTop: 12 }]}
                        >
                            <Text style={styles.cardActionSecondaryText}>Ver todos los patrones</Text>
                        </TouchableOpacity>
                    )}
                </View>
            ) : (
                <View style={{ gap: 18 }}>
                    {patternGroups.map((grp) => {
                        const activeExec = grp.activeExecution;
                        const activeStatusStyle = getStatusStyle(activeExec.status);
                        const linkedCreation = grp.creationId ? creationMap.get(grp.creationId) : null;
                        const garmentPhoto = getPatternGarmentPhoto(grp.garmentType, linkedCreation);

                        return (
                            <View
                                key={grp.id}
                                style={[
                                    styles.groupMasterCard,
                                    grp.isApproved && styles.cardItemApproved,
                                ]}
                            >
                                {/* Encabezado del Grupo de Patrón con Fotografía Visual */}
                                <View style={styles.groupMasterHeader}>
                                    <View style={styles.groupMasterHeaderLeft}>
                                        <Image
                                            source={garmentPhoto}
                                            style={styles.patternGarmentPhoto}
                                            resizeMode="cover"
                                        />
                                        <View style={{ flex: 1, minWidth: 200 }}>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                                <Text style={styles.groupMasterTitle}>
                                                    {getGarmentLabel(grp.garmentType)}
                                                </Text>
                                                <View style={styles.versionCountBadge}>
                                                    <Text style={styles.versionCountBadgeText}>
                                                        {grp.totalVersions} {grp.totalVersions === 1 ? 'ejecución' : 'ejecuciones'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                                                {linkedCreation ? (
                                                    <View style={styles.creationBadge}>
                                                        <Text style={styles.creationBadgeText}>
                                                            👗 Creación: {linkedCreation.name}
                                                        </Text>
                                                    </View>
                                                ) : (
                                                    <View style={[styles.creationBadge, { backgroundColor: '#F5F3EF', borderColor: colors.sand }]}>
                                                        <Text style={[styles.creationBadgeText, { color: colors.textSecondary }]}>
                                                            📐 Patrón independiente (Sin creación)
                                                        </Text>
                                                    </View>
                                                )}
                                                <Text style={styles.cardItemSubtitle}>
                                                    Última actualización: {formatDate(activeExec.created_at)}
                                                </Text>
                                            </View>
                                        </View>
                                    </View>

                                    <View
                                        style={[
                                            styles.statusTag,
                                            {
                                                backgroundColor: activeStatusStyle.bg,
                                                borderColor: activeStatusStyle.border,
                                            },
                                        ]}
                                    >
                                        <Text style={[styles.statusTagText, { color: activeStatusStyle.color }]}>
                                            {grp.isApproved ? '✓ VIGENTE · APROBADO' : `✓ VIGENTE · ${activeStatusStyle.label}`}
                                        </Text>
                                    </View>
                                </View>

                                {/* ÁRBOL DE LINAJE TÉCNICO */}
                                <View style={styles.groupTreeBox}>
                                    <Text style={styles.groupTreeBoxTitle}>
                                        HISTORIAL TÉCNICO · {grp.totalVersions} EJECUCIONES & REVISIONES
                                    </Text>
                                    <View style={{ gap: 10, marginTop: 8 }}>
                                        {grp.executions.slice(0, Math.min(grp.executions.length, 2)).map((p) => {
                                            const isCurrent = p.id === activeExec.id;
                                            const pStatus = getStatusStyle(p.status);
                                            const pSession = p.session_id ? sessionMap.get(p.session_id) : null;

                                            return (
                                                <View
                                                    key={p.id}
                                                    style={[
                                                        styles.versionNodeCard,
                                                        isCurrent && styles.versionNodeCardCurrent,
                                                    ]}
                                                >
                                                    <View style={styles.versionNodeHeaderRow}>
                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                                                            <View style={[styles.versionBadge, isCurrent && styles.versionBadgeCurrent]}>
                                                                <Text style={[styles.versionBadgeText, isCurrent && styles.versionBadgeTextCurrent]}>
                                                                    {p.version_label}
                                                                </Text>
                                                            </View>
                                                            <View
                                                                style={[
                                                                    styles.statusTagSmall,
                                                                    {
                                                                        backgroundColor: pStatus.bg,
                                                                        borderColor: pStatus.border,
                                                                    },
                                                                ]}
                                                            >
                                                                <Text style={[styles.statusTagSmallText, { color: pStatus.color }]}>
                                                                    {pStatus.label}
                                                                </Text>
                                                            </View>
                                                            {isCurrent ? (
                                                                <View style={styles.currentIndicatorBadge}>
                                                                    <Text style={styles.currentIndicatorBadgeText}>● PATRÓN VIGENTE</Text>
                                                                </View>
                                                            ) : (
                                                                <View style={styles.historicalIndicatorBadge}>
                                                                    <Text style={styles.historicalIndicatorBadgeText}>○ HISTÓRICO</Text>
                                                                </View>
                                                            )}
                                                        </View>

                                                        <Text style={styles.versionNodeDate}>
                                                            {formatDate(p.created_at)}
                                                        </Text>
                                                    </View>

                                                    {/* Fila de metadatos técnicos */}
                                                    <View style={styles.versionNodeMetaRow}>
                                                        <Text style={styles.versionNodeMetaText}>
                                                            {p.parent_execution_id
                                                                ? `↳ Derivado de Padre #${p.parent_execution_id.slice(0, 8)}`
                                                                : '↳ Raíz original (Trazado base)'}
                                                            {' · '}
                                                            📐 Sesión: {pSession ? `v${pSession.version_number}` : 'N/A'}
                                                            {' · '}
                                                            Piezas CAD: {p.geometry_result?.pieces?.length || 0}
                                                            {' · '}
                                                            Holgura: {p.ease_profile_snapshot?.name || 'Estándar'}
                                                        </Text>
                                                    </View>

                                                    {/* Acciones de la versión */}
                                                    <View style={styles.versionNodeFooter}>
                                                        <TouchableOpacity
                                                            onPress={() => onInspectPattern(p)}
                                                            style={styles.cardActionSecondary}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={styles.cardActionSecondaryText}>
                                                                🔍 Detalle & Linaje
                                                            </Text>
                                                        </TouchableOpacity>

                                                        {onOpenCad && (
                                                            <TouchableOpacity
                                                                onPress={() =>
                                                                    onOpenCad({
                                                                        clientId: client.id,
                                                                        sessionId: p.session_id,
                                                                        creationId: p.creation_id,
                                                                        garmentType: p.garment_type,
                                                                        executionId: p.id,
                                                                    })
                                                                }
                                                                style={styles.cardActionPrimary}
                                                                activeOpacity={0.85}
                                                            >
                                                                <Text style={styles.cardActionPrimaryText}>📐 Abrir CAD →</Text>
                                                            </TouchableOpacity>
                                                        )}
                                                    </View>
                                                </View>
                                            );
                                        })}

                                        {/* Grupo jerárquico desplegable para ejecuciones preliminares */}
                                        {grp.executions.length > 2 && (
                                            <View style={styles.preliminaryExecContainer}>
                                                <TouchableOpacity
                                                    style={styles.preliminaryToggleBtn}
                                                    onPress={() =>
                                                        setExpandedHistoryGroupIds((prev) => ({
                                                            ...prev,
                                                            [grp.id]: !prev[grp.id],
                                                        }))
                                                    }
                                                    activeOpacity={0.8}
                                                >
                                                    <Text style={styles.preliminaryToggleBtnText}>
                                                        {expandedHistoryGroupIds[grp.id]
                                                            ? `▲ Ocultar ${grp.executions.length - 2} ejecuciones técnicas preliminares`
                                                            : `▼ ${grp.executions.length - 2} ejecuciones preliminares (cálculos CAD de taller) [Ver historial completo]`}
                                                    </Text>
                                                </TouchableOpacity>

                                                {expandedHistoryGroupIds[grp.id] && (
                                                    <View style={{ gap: 10, marginTop: 10 }}>
                                                        {grp.executions.slice(2).map((p) => {
                                                            const isCurrent = p.id === activeExec.id;
                                                            const pStatus = getStatusStyle(p.status);
                                                            const pSession = p.session_id ? sessionMap.get(p.session_id) : null;

                                                            return (
                                                                <View
                                                                    key={p.id}
                                                                    style={[
                                                                        styles.versionNodeCard,
                                                                        isCurrent && styles.versionNodeCardCurrent,
                                                                    ]}
                                                                >
                                                                    <View style={styles.versionNodeHeaderRow}>
                                                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                                                                            <View style={[styles.versionBadge, isCurrent && styles.versionBadgeCurrent]}>
                                                                                <Text style={[styles.versionBadgeText, isCurrent && styles.versionBadgeTextCurrent]}>
                                                                                    {p.version_label}
                                                                                </Text>
                                                                            </View>
                                                                            <View
                                                                                style={[
                                                                                    styles.statusTagSmall,
                                                                                    {
                                                                                        backgroundColor: pStatus.bg,
                                                                                        borderColor: pStatus.border,
                                                                                    },
                                                                                ]}
                                                                            >
                                                                                <Text style={[styles.statusTagSmallText, { color: pStatus.color }]}>
                                                                                    {pStatus.label}
                                                                                </Text>
                                                                            </View>
                                                                            <View style={styles.historicalIndicatorBadge}>
                                                                                <Text style={styles.historicalIndicatorBadgeText}>○ HISTÓRICO</Text>
                                                                            </View>
                                                                        </View>
                                                                        <Text style={styles.versionNodeDate}>
                                                                            {formatDate(p.created_at)}
                                                                        </Text>
                                                                    </View>
                                                                    <View style={styles.versionNodeMetaRow}>
                                                                        <Text style={styles.versionNodeMetaText}>
                                                                            {p.parent_execution_id
                                                                                ? `↳ Derivado de Padre #${p.parent_execution_id.slice(0, 8)}`
                                                                                : '↳ Raíz original (Trazado base)'}
                                                                            {' · '}📐 Sesión: {pSession ? `v${pSession.version_number}` : 'N/A'}
                                                                            {' · '}Piezas: {p.geometry_result?.pieces?.length || 0}
                                                                            {' · '}Holgura: {p.ease_profile_snapshot?.name || 'Estándar'}
                                                                        </Text>
                                                                    </View>
                                                                    <View style={styles.versionNodeFooter}>
                                                                        <TouchableOpacity
                                                                            onPress={() => onInspectPattern(p)}
                                                                            style={styles.cardActionSecondary}
                                                                            activeOpacity={0.8}
                                                                        >
                                                                            <Text style={styles.cardActionSecondaryText}>
                                                                                🔍 Detalle & Linaje
                                                                            </Text>
                                                                        </TouchableOpacity>
                                                                        {onOpenCad && (
                                                                            <TouchableOpacity
                                                                                onPress={() =>
                                                                                    onOpenCad({
                                                                                        clientId: client.id,
                                                                                        sessionId: p.session_id,
                                                                                        creationId: p.creation_id,
                                                                                        garmentType: p.garment_type,
                                                                                        executionId: p.id,
                                                                                    })
                                                                                }
                                                                                style={styles.cardActionPrimary}
                                                                                activeOpacity={0.85}
                                                                            >
                                                                                <Text style={styles.cardActionPrimaryText}>📐 Abrir CAD →</Text>
                                                                            </TouchableOpacity>
                                                                        )}
                                                                    </View>
                                                                </View>
                                                            );
                                                        })}
                                                    </View>
                                                )}
                                            </View>
                                        )}
                                    </View>
                                </View>
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

