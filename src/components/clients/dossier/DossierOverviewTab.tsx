// ==============================================================================
// COMPONENTE: PESTAÑA DE RESUMEN GENERAL Y ARQUITECTURA RELACIONAL
// Archivo: src/components/clients/dossier/DossierOverviewTab.tsx
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Client } from '../../../types/client';
import { Creation } from '../../../types/creation';
import { MeasuredPerson } from '../../../types/personGroup';
import { MeasurementCampaign } from '../../../types/pattern/measurementCampaign';
import { MeasurementSession } from '../../../types/pattern/measurement';
import { GarmentType, PatternExecution, PatternStatus } from '../../../types/pattern/pattern';
import { ConceptualPatternGroup } from '../../../utils/clientPatternLineageHelper';
import { DossierTab } from './DossierClientHeader';
import { styles } from './clientDossierStyles';

interface DossierOverviewTabProps {
    client: Client;
    isInstitutional: boolean;
    persons: MeasuredPerson[];
    campaigns: MeasurementCampaign[];
    sessionMetrics: { total: number; completed: number; draft: number };
    latestTitularSession: MeasurementSession | null;
    creations: Creation[];
    patternGroups: ConceptualPatternGroup[];
    patternStats: { patternsCount: number; totalExecutionsCount: number; activePatternsCount: number };
    personMap: Map<string, MeasuredPerson>;
    getCreationPhoto: (c: Creation) => any;
    getGarmentLabel: (gt: string) => string;
    getStatusStyle: (status: PatternStatus) => { label: string; bg: string; color: string; border: string };
    formatDate: (dateStr?: string | null) => string;
    onSelectTab: (tab: DossierTab) => void;
    onViewSessionDetails: (s: MeasurementSession) => void;
    onInspectPattern: (p: PatternExecution) => void;
    onOpenCreation?: (creationId: string) => void;
    onOpenCad?: (params: {
        clientId: string;
        sessionId?: string | null;
        creationId?: string | null;
        garmentType?: GarmentType | null;
        executionId?: string | null;
    }) => void;
}

export const DossierOverviewTab: React.FC<DossierOverviewTabProps> = ({
    client,
    isInstitutional,
    persons,
    campaigns,
    sessionMetrics,
    latestTitularSession,
    creations,
    patternGroups,
    patternStats,
    personMap,
    getCreationPhoto,
    getGarmentLabel,
    getStatusStyle,
    formatDate,
    onSelectTab,
    onViewSessionDetails,
    onInspectPattern,
    onOpenCreation,
    onOpenCad,
}) => {
    return (
        <View style={styles.tabContentSection}>
            <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeaderTitle}>ARQUITECTURA RELACIONAL DE LA CLIENTA</Text>
                <Text style={styles.sectionHeaderSubtitle}>
                    Clienta → Sesiones de Medidas → Patrones CAD → Creaciones → Linaje Inmutable
                </Text>
            </View>

            {/* Resumen de Medidas / Resumen Institucional (H-01) */}
            {isInstitutional ? (
                <View style={styles.summaryCard}>
                    <View style={styles.summaryCardHeader}>
                        <Text style={styles.summaryCardSuper}>EXPEDIENTE INSTITUCIONAL · NÚCLEO COLECTIVO</Text>
                        <Text style={styles.summaryCardTitle}>Gestión de Sujetos Medidos y Jornadas</Text>
                    </View>
                    <View>
                        <View style={styles.summaryDetailRow}>
                            <Text style={styles.summaryDetailLabel}>Alumnos / Personas Registradas:</Text>
                            <Text style={styles.summaryDetailValue}>
                                {persons.length} integrantes vinculados
                            </Text>
                        </View>
                        <View style={styles.summaryDetailRow}>
                            <Text style={styles.summaryDetailLabel}>Jornadas de Medición:</Text>
                            <Text style={styles.summaryDetailValue}>
                                {campaigns.length} {campaigns.length === 1 ? 'jornada registrada' : 'jornadas registradas'}
                            </Text>
                        </View>
                        <View style={styles.summaryDetailRow}>
                            <Text style={styles.summaryDetailLabel}>Sesiones Técnicas de Taller:</Text>
                            <Text style={styles.summaryDetailValue}>
                                {sessionMetrics.total} sesiones ({sessionMetrics.completed} finalizadas · {sessionMetrics.draft} borradores)
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.summaryActionBtn}
                            onPress={() => onSelectTab('persons_groups')}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.summaryActionBtnText}>Gestionar Alumnos y Jornadas →</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.summaryCard}>
                    <View style={styles.summaryCardHeader}>
                        <Text style={styles.summaryCardSuper}>ANATOMÍA CORPORAL</Text>
                        <Text style={styles.summaryCardTitle}>Última Sesión de Medidas</Text>
                    </View>
                    {latestTitularSession ? (
                        <View>
                            <View style={styles.summaryDetailRow}>
                                <Text style={styles.summaryDetailLabel}>Versión Activa:</Text>
                                <Text style={styles.summaryDetailValue}>
                                    Sesión v{latestTitularSession.version_number} ({formatDate(latestTitularSession.session_date)})
                                </Text>
                            </View>
                            <View style={styles.summaryDetailRow}>
                                <Text style={styles.summaryDetailLabel}>Estado de Sesión:</Text>
                                <Text style={styles.summaryDetailValue}>
                                    {latestTitularSession.status === 'completed'
                                        ? '🛡️ Finalizada & Inmutable'
                                        : latestTitularSession.status === 'verified'
                                        ? '✅ Verificada'
                                        : '📝 Borrador'}
                                </Text>
                            </View>
                            <View style={styles.summaryDetailRow}>
                                <Text style={styles.summaryDetailLabel}>Medidas Registradas:</Text>
                                <Text style={styles.summaryDetailValue}>
                                    {Object.keys(latestTitularSession.values || {}).length} cotas métricas
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.summaryActionBtn}
                                onPress={() => onViewSessionDetails(latestTitularSession)}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.summaryActionBtnText}>Consultar Medidas en Detalle →</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <Text style={styles.emptyStateNotice}>
                            La clienta aún no tiene sesiones de medidas registradas.
                        </Text>
                    )}
                </View>
            )}

            {/* Creaciones */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                    <Text style={styles.summaryCardSuper}>PROYECTOS & ENCARGOS</Text>
                    <Text style={styles.summaryCardTitle}>Creaciones de Alta Costura ({creations.length})</Text>
                </View>
                {creations.length > 0 ? (
                    <View style={{ gap: 8 }}>
                        {creations.slice(0, 3).map((c) => {
                            const beneficiary = c.person || (c.person_id ? personMap.get(c.person_id) : null);
                            return (
                                <View key={c.id} style={styles.miniListItem}>
                                    <Image
                                        source={getCreationPhoto(c)}
                                        style={styles.miniGarmentPhoto}
                                        resizeMode="cover"
                                    />
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={styles.miniItemTitle}>{c.name}</Text>
                                        {beneficiary && (
                                            <Text style={styles.miniItemBeneficiary}>
                                                👤 {beneficiary.full_name} {beneficiary.reference_id ? `(${beneficiary.reference_id})` : ''}
                                            </Text>
                                        )}
                                        <Text style={styles.miniItemSub}>
                                            {c.garment_type ? getGarmentLabel(c.garment_type) : 'Prenda no definida'} · {c.status}
                                        </Text>
                                    </View>
                                    {onOpenCreation && (
                                        <TouchableOpacity
                                            onPress={() => onOpenCreation(c.id)}
                                            style={styles.miniItemBtn}
                                        >
                                            <Text style={styles.miniItemBtnText}>Ver →</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            );
                        })}

                        {creations.length > 3 && (
                            <TouchableOpacity
                                onPress={() => onSelectTab('creations')}
                                style={styles.viewAllCreationsBtn}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.viewAllCreationsBtnText}>
                                    Ver todas las Creaciones ({creations.length}) →
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>
                ) : (
                    <Text style={styles.emptyStateNotice}>
                        Sin creaciones registradas para esta clienta.
                    </Text>
                )}
            </View>

            {/* Patrones CAD — Agrupados por Linaje y Versión Vigente */}
            <View style={styles.summaryCard}>
                <View style={styles.summaryCardHeader}>
                    <Text style={styles.summaryCardSuper}>PATRONAJE CAD · LINAJE EDITORIAL</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6 }}>
                        <Text style={styles.summaryCardTitle}>
                            Patrones de la Clienta ({patternGroups.length})
                        </Text>
                        <Text style={styles.summaryCardSubCounter}>
                            {patternStats.totalExecutionsCount} ejecuciones registradas · {patternStats.activePatternsCount} vigentes
                        </Text>
                    </View>
                </View>
                {patternGroups.length > 0 ? (
                    <View style={{ gap: 14 }}>
                        {patternGroups.slice(0, 3).map((grp) => {
                            const activeExec = grp.activeExecution;
                            const activeStatus = getStatusStyle(activeExec.status);
                            return (
                                <View key={grp.id} style={styles.lineageOverviewCard}>
                                    {/* Cabecera del Patrón */}
                                    <View style={styles.lineageOverviewHeader}>
                                        <View style={{ flex: 1, marginRight: 8 }}>
                                            <Text style={styles.lineageOverviewGarmentTitle}>
                                                {getGarmentLabel(grp.garmentType).toUpperCase()}
                                            </Text>
                                            <Text style={styles.lineageOverviewCreationSubtitle}>
                                                {grp.creationName ? `👗 Creación: ${grp.creationName}` : '📐 Patrón independiente (Patronaje directo)'}
                                            </Text>
                                        </View>
                                        <View
                                            style={[
                                                styles.statusTag,
                                                {
                                                    backgroundColor: activeStatus.bg,
                                                    borderColor: activeStatus.border,
                                                },
                                            ]}
                                        >
                                            <Text style={[styles.statusTagText, { color: activeStatus.color }]}>
                                                {grp.isApproved ? '✓ VIGENTE · APROBADO' : `✓ VIGENTE · ${activeStatus.label}`}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Historial Técnico */}
                                    <View style={styles.lineageOverviewVersionsBox}>
                                        <Text style={styles.lineageOverviewVersionsTitle}>
                                            HISTORIAL TÉCNICO · {grp.totalVersions} EJECUCIONES
                                        </Text>
                                        <View style={styles.lineageOverviewVersionsList}>
                                            {grp.executions.slice(0, 3).map((item, idx) => {
                                                const isCurrent = item.id === activeExec.id;
                                                const itemStatus = getStatusStyle(item.status);
                                                return (
                                                    <View key={item.id} style={styles.lineageVersionRow}>
                                                        <View style={styles.lineageVersionBulletCol}>
                                                            <Text style={[styles.lineageVersionBullet, isCurrent && styles.lineageVersionBulletActive]}>
                                                                {isCurrent ? '●' : '○'}
                                                            </Text>
                                                            {idx < Math.min(grp.executions.length, 3) - 1 && (
                                                                <View style={styles.lineageVersionConnectLine} />
                                                            )}
                                                        </View>
                                                        <View style={styles.lineageVersionContent}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                                <Text style={[styles.lineageVersionLabelText, isCurrent && styles.lineageVersionLabelTextActive]}>
                                                                    {item.version_label}
                                                                </Text>
                                                                <View style={[styles.statusTagSmall, { backgroundColor: itemStatus.bg, borderColor: itemStatus.border }]}>
                                                                    <Text style={[styles.statusTagSmallText, { color: itemStatus.color }]}>
                                                                        {itemStatus.label}
                                                                    </Text>
                                                                </View>
                                                                {isCurrent && (
                                                                    <View style={styles.currentIndicatorBadge}>
                                                                        <Text style={styles.currentIndicatorBadgeText}>VIGENTE</Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                            <Text style={styles.lineageVersionDateText}>
                                                                └─ {formatDate(item.created_at)} · {item.parent_execution_id ? 'Revisión derivada' : 'Trazado base original'}
                                                            </Text>
                                                        </View>
                                                        <TouchableOpacity
                                                            onPress={() => onInspectPattern(item)}
                                                            style={styles.lineageVersionMiniBtn}
                                                            activeOpacity={0.8}
                                                        >
                                                            <Text style={styles.lineageVersionMiniBtnText}>Detalle →</Text>
                                                        </TouchableOpacity>
                                                    </View>
                                                );
                                            })}
                                            {grp.executions.length > 3 && (
                                                <TouchableOpacity
                                                    onPress={() => onSelectTab('patterns')}
                                                    style={{ paddingVertical: 4 }}
                                                >
                                                    <Text style={styles.lineageMoreVersionsText}>
                                                        + {grp.executions.length - 3} ejecuciones técnicas en el linaje histórico...
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                        </View>
                                    </View>

                                    {/* Acciones */}
                                    <View style={styles.lineageOverviewActionsRow}>
                                        <TouchableOpacity
                                            onPress={() => onInspectPattern(activeExec)}
                                            style={styles.lineageCardBtnSecondary}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.lineageCardBtnSecondaryText}>🔍 Detalle & Trazabilidad</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            onPress={() => onSelectTab('patterns')}
                                            style={styles.lineageCardBtnOutline}
                                            activeOpacity={0.8}
                                        >
                                            <Text style={styles.lineageCardBtnOutlineText}>🌳 Ver Linaje Completo →</Text>
                                        </TouchableOpacity>
                                        {onOpenCad && (
                                            <TouchableOpacity
                                                onPress={() =>
                                                    onOpenCad({
                                                        clientId: client.id,
                                                        sessionId: activeExec.session_id,
                                                        creationId: activeExec.creation_id,
                                                        garmentType: activeExec.garment_type,
                                                        executionId: activeExec.id,
                                                    })
                                                }
                                                style={styles.lineageCardBtnPrimary}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.lineageCardBtnPrimaryText}>📐 Abrir en Mesa CAD →</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            );
                        })}
                    </View>
                ) : (
                    <Text style={styles.emptyStateNotice}>
                        Sin patrones generados para esta clienta.
                    </Text>
                )}
            </View>
        </View>
    );
};

