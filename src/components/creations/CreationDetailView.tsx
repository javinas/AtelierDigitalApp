// ==============================================================================
// ATELIER DIGITAL — SUBCOMPONENTE: VISTA DETALLADA DE CREACIÓN
// Archivo: src/components/creations/CreationDetailView.tsx
// ==============================================================================

import React, { useEffect, useState } from 'react';
import {
    Image,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { GARMENT_PACKAGES } from '../../engine/pattern/catalog/garmentPackages';
import { Creation, CreationStatus } from '../../types/creation';
import { DesignProposal } from '../../types/commercial';
import { CreationMoodboard } from '../../types/design';
import { PatternExecution } from '../../types/pattern/pattern';
import {
    fetchCommercialProfile,
    fetchProposalsByCreation,
} from '../../services/commercialService';
import { fetchMoodboardByCreation } from '../../services/designService';
import {
    NECKLINE_OPTIONS,
    SILHOUETTE_OPTIONS,
    SLEEVE_OPTIONS,
} from '../../services/designMockData';
import { styles } from './creationsModuleStyles';
import { CreationMaterialsTab } from '../commercial/CreationMaterialsTab';
import { CreationQuotesTab } from '../commercial/CreationQuotesTab';
import { ProjectExecutionTab } from '../commercial/ProjectExecutionTab';
import { FinancialControlTab } from '../commercial/FinancialControlTab';
import { CreationLogbookTab } from '../commercial/CreationLogbookTab';
import { CreationMoodboardTab } from '../design/CreationMoodboardTab';
import {
    CreationDetailTab,
    GARMENT_TYPE_LABELS,
    getCreationPhoto,
    getCreationStages,
    STATUS_LABELS,
    TYPE_LABELS,
} from './creationsModel';

export interface CreationDetailViewProps {
    selectedCreation: Creation;
    setSelectedCreation: (c: Creation | null) => void;
    handleOpenEditModal: () => void;
    handleChangeStatus: (status: CreationStatus) => void;
    onOpenClient?: (clientId: string) => void;
    detailActiveTab: CreationDetailTab;
    setDetailActiveTab: (tab: CreationDetailTab) => void;
    setIsLinkSessionModalOpen: (open: boolean) => void;
    handleSelectSessionToLink: (sessionId: string | null) => void;
    setIsCadOpen: (open: boolean) => void;
}

export const CreationDetailView: React.FC<CreationDetailViewProps> = ({
    selectedCreation,
    setSelectedCreation,
    handleOpenEditModal,
    handleChangeStatus,
    onOpenClient,
    detailActiveTab,
    setDetailActiveTab,
    setIsLinkSessionModalOpen,
    handleSelectSessionToLink,
    setIsCadOpen,
}) => {
    const [cadMoodboardRef, setCadMoodboardRef] = useState<CreationMoodboard | null>(null);
    const [activeProposal, setActiveProposal] = useState<DesignProposal | null>(null);

    useEffect(() => {
        let isActive = true;
        if (selectedCreation?.id) {
            fetchMoodboardByCreation(selectedCreation.id, selectedCreation.name).then((res) => {
                if (isActive) setCadMoodboardRef(res.data);
            });

            Promise.all([
                fetchCommercialProfile(selectedCreation.id),
                fetchProposalsByCreation(selectedCreation.id),
            ]).then(([profileRes, proposalsRes]) => {
                if (!isActive) return;
                const list = proposalsRes.data || [];
                const profileActiveId = profileRes.data?.active_proposal_id;
                const resolved =
                    (profileActiveId ? list.find((p) => p.id === profileActiveId) : null) ||
                    list.find((p) => p.status === 'approved') ||
                    list[0] ||
                    null;
                setActiveProposal(resolved);
            });
        }

        return () => {
            isActive = false;
        };
    }, [selectedCreation?.id, selectedCreation?.name, detailActiveTab]);

    const silhouetteLabel =
        SILHOUETTE_OPTIONS.find((s) => s.code === cadMoodboardRef?.silhouette_code)?.label ||
        'Evasé Imperial';
    const necklineLabel =
        NECKLINE_OPTIONS.find((n) => n.code === cadMoodboardRef?.neckline_code)?.label ||
        'Reina Ana';
    const sleeveLabel =
        SLEEVE_OPTIONS.find((s) => s.code === cadMoodboardRef?.sleeve_code)?.label ||
        'Sastre Estructurada';

    return (
        <ScrollView contentContainerStyle={styles.detailScrollContent}>
            {/* Barra de navegación interna del detalle */}
            <View style={styles.detailNavBar}>
                <TouchableOpacity
                    onPress={() => setSelectedCreation(null)}
                    style={styles.detailBackBtn}
                >
                    <Text style={styles.detailBackBtnText}>← Volver a la Lista de Creaciones</Text>
                </TouchableOpacity>

                <View style={styles.detailNavActions}>
                    <TouchableOpacity
                        style={styles.editCreationBtn}
                        onPress={handleOpenEditModal}
                    >
                        <Text style={styles.editCreationBtnText}>✎ Editar Creación</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Tarjeta Editorial de la Creación */}
            <View style={styles.creationCardHeader}>
                <View style={styles.creationHeaderTopRow}>
                    <Image
                        source={getCreationPhoto(selectedCreation)}
                        style={styles.detailHeaderPhoto}
                        resizeMode="cover"
                    />
                    <View style={{ flex: 1 }}>
                        <View style={styles.badgeRow}>
                            <View
                                style={[
                                    styles.statusBadge,
                                    {
                                        backgroundColor: (STATUS_LABELS[selectedCreation.status] || STATUS_LABELS.draft).bg,
                                        borderColor: (STATUS_LABELS[selectedCreation.status] || STATUS_LABELS.draft).border,
                                    },
                                ]}
                            >
                                <Text
                                    style={[
                                        styles.statusBadgeText,
                                        { color: (STATUS_LABELS[selectedCreation.status] || STATUS_LABELS.draft).color },
                                    ]}
                                >
                                    {(STATUS_LABELS[selectedCreation.status] || STATUS_LABELS.draft).label.toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.typeBadge}>
                                <Text style={styles.typeBadgeText}>
                                    {TYPE_LABELS[selectedCreation.creation_type]}
                                </Text>
                            </View>
                        </View>
                        <Text style={styles.creationTitle}>{selectedCreation.name}</Text>
                        {selectedCreation.occasion && (
                            <Text style={styles.creationOccasion}>
                                Ocasión: {selectedCreation.occasion}
                            </Text>
                        )}
                    </View>

                    {/* Selector rápido de estado */}
                    <View style={styles.statusQuickSwitchBox}>
                        <Text style={styles.quickSwitchLabel}>CAMBIAR ESTADO:</Text>
                        <View style={styles.statusChipsGrid}>
                            {(['draft', 'active', 'fitting', 'approved', 'production', 'completed', 'cancelled'] as CreationStatus[]).map((st) => (
                                <TouchableOpacity
                                    key={st}
                                    style={[
                                        styles.statusChip,
                                        selectedCreation.status === st && styles.statusChipActive,
                                    ]}
                                    onPress={() => handleChangeStatus(st)}
                                >
                                    <Text
                                        style={[
                                            styles.statusChipText,
                                            selectedCreation.status === st && styles.statusChipTextActive,
                                        ]}
                                    >
                                        {STATUS_LABELS[st].label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Descripción / Concepto artístico */}
                {selectedCreation.description ? (
                    <View style={styles.conceptBox}>
                        <Text style={styles.conceptBoxLabel}>CONCEPTO & DESCRIPCIÓN DEL PROYECTO</Text>
                        <Text style={styles.conceptBoxText}>{selectedCreation.description}</Text>
                    </View>
                ) : null}

                {/* Datos de la Clienta */}
                <View style={styles.clientInfoStrip}>
                    <View style={styles.clientAvatar}>
                        <Text style={styles.clientAvatarText}>
                            {selectedCreation.client?.full_name?.slice(0, 2).toUpperCase() || 'LM'}
                        </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.clientNameLabel}>
                            CLIENTA ASOCIADA · ALTA COSTURA
                        </Text>
                        <Text style={styles.clientFullName}>
                            {selectedCreation.client?.full_name || 'Clienta no identificada'}
                        </Text>
                        <Text style={styles.clientSubDetail}>
                            {selectedCreation.client?.city ? `📍 ${selectedCreation.client.city}  ·  ` : ''}
                            {selectedCreation.client?.phone ? `📞 ${selectedCreation.client.phone}  ·  ` : ''}
                            {selectedCreation.client?.email || ''}
                        </Text>
                        {selectedCreation.person && (
                            <Text style={[styles.clientSubDetail, { color: colors.champagneGold, fontWeight: '700', marginTop: 4 }]}>
                                👤 Sujeto Medido: {selectedCreation.person.full_name} ({selectedCreation.person.demographic_category})
                            </Text>
                        )}
                    </View>
                    {selectedCreation.target_date && (
                        <View style={styles.targetDateBox}>
                            <Text style={styles.targetDateLabel}>FECHA OBJETIVO</Text>
                            <Text style={styles.targetDateValue}>{selectedCreation.target_date}</Text>
                        </View>
                    )}
                    {onOpenClient && selectedCreation.client_id ? (
                        <TouchableOpacity
                            style={styles.viewClientDirBtn}
                            onPress={() => onOpenClient(selectedCreation.client_id)}
                            activeOpacity={0.85}
                        >
                            <Text style={styles.viewClientDirBtnText}>
                                Ver ficha de clienta →
                            </Text>
                        </TouchableOpacity>
                    ) : null}
                </View>

                {/* Evolución Editorial del Proyecto (7 etapas) */}
                <View style={styles.detailStepperBox}>
                    <Text style={styles.detailStepperHeader}>PROGRESO EDITORIAL DE LA PRENDA</Text>
                    <View style={styles.stepperRow}>
                        {getCreationStages(selectedCreation).map((stg, idx, arr) => (
                            <React.Fragment key={stg.id}>
                                <View style={styles.stepperNode}>
                                    <View
                                        style={[
                                            styles.stepperDot,
                                            stg.status === 'completed' && styles.stepperDotCompleted,
                                            stg.status === 'current' && styles.stepperDotCurrent,
                                            stg.status === 'cancelled' && styles.stepperDotCancelled,
                                        ]}
                                    >
                                        <Text
                                            style={[
                                                styles.stepperDotText,
                                                stg.status === 'completed' && styles.stepperDotTextCompleted,
                                                stg.status === 'current' && styles.stepperDotTextCurrent,
                                            ]}
                                        >
                                            {stg.status === 'completed' ? '✓' : stg.status === 'current' ? '●' : stg.status === 'cancelled' ? '✕' : (idx + 1).toString()}
                                        </Text>
                                    </View>
                                    <Text
                                        style={[
                                            styles.stepperLabel,
                                            stg.status === 'completed' && styles.stepperLabelCompleted,
                                            stg.status === 'current' && styles.stepperLabelCurrent,
                                        ]}
                                    >
                                        {stg.label}
                                    </Text>
                                </View>
                                {idx < arr.length - 1 && (
                                    <View
                                        style={[
                                            styles.stepperLine,
                                            stg.status === 'completed' && arr[idx + 1].status !== 'pending' && styles.stepperLineCompleted,
                                        ]}
                                    />
                                )}
                            </React.Fragment>
                        ))}
                    </View>
                </View>
            </View>

            {/* Barra de Navegación Editorial por Pestañas (Sección 14) */}
            <View style={styles.detailTabsContainer}>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.detailTabsScroll}
                >
                    {[
                        { id: 'resumen', label: 'Resumen' },
                        { id: 'concepto', label: 'Concepto & Moodboard' },
                        { id: 'medidas', label: 'Medidas' },
                        { id: 'patronaje', label: 'Patronaje' },
                        { id: 'fitting', label: 'Fitting' },
                        { id: 'materiales', label: 'Materiales' },
                        { id: 'cotizaciones', label: 'Cotizaciones' },
                        { id: 'confeccion', label: 'Confección' },
                        { id: 'finanzas', label: 'Finanzas' },
                        { id: 'bitacora', label: 'Bitácora' },
                    ].map((tab) => (
                        <TouchableOpacity
                            key={tab.id}
                            testID={`detail-tab-${tab.id}`}
                            style={[
                                styles.detailTabBtn,
                                detailActiveTab === tab.id && styles.detailTabBtnActive,
                            ]}
                            onPress={() => setDetailActiveTab(tab.id as CreationDetailTab)}
                            activeOpacity={0.8}
                        >
                            <Text
                                style={[
                                    styles.detailTabBtnText,
                                    detailActiveTab === tab.id && styles.detailTabBtnTextActive,
                                ]}
                            >
                                {tab.label}
                            </Text>
                            {detailActiveTab === tab.id && <View style={styles.detailTabIndicator} />}
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* SECCIONES EDITORIALES EN REJILLA SEGÚN PESTAÑA ACTIVA */}
            <View style={styles.sectionsGrid}>
                {/* 1. SECCIÓN DE MEDIDAS (REGLA 6) */}
                {(detailActiveTab === 'resumen' || detailActiveTab === 'medidas') && (
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionCardHeader}>
                            <View>
                                <Text style={styles.sectionCardTitle}>1. SESIÓN DE MEDIDAS</Text>
                                <Text style={styles.sectionCardSubtitle}>
                                    Asociación anatómica para el encargo
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.linkSessionBtn}
                                onPress={() => setIsLinkSessionModalOpen(true)}
                            >
                                <Text style={styles.linkSessionBtnText}>
                                    {selectedCreation.session_id ? 'Cambiar Sesión' : '+ Vincular Sesión'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {selectedCreation.session ? (
                            <View style={styles.sessionLinkedBox}>
                                <View style={styles.sessionLinkedRow}>
                                    <Text style={styles.sessionBadge}>
                                        ✓ Sesión v{selectedCreation.session.version_number} ({selectedCreation.session.status.toUpperCase()})
                                    </Text>
                                    <Text style={styles.sessionDate}>
                                        Fecha: {new Date(selectedCreation.session.session_date).toLocaleDateString()}
                                    </Text>
                                </View>
                                <Text style={styles.sessionMeta}>
                                    Sistema de unidades: {selectedCreation.session.unit_system === 'in' ? 'Imperial (pulgadas)' : 'Métrico (cm/mm)'}
                                </Text>
                                <TouchableOpacity
                                    style={styles.unlinkBtn}
                                    onPress={() => handleSelectSessionToLink(null)}
                                >
                                    <Text style={styles.unlinkBtnText}>Desvincular sesión</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.emptySessionBox}>
                                <Text style={styles.emptySessionTitle}>Sin sesión de medidas vinculada</Text>
                                <Text style={styles.emptySessionText}>
                                    La Creación puede permanecer sin medidas tomadas durante la fase conceptual de diseño.
                                </Text>
                                <TouchableOpacity
                                    style={styles.primaryActionBtn}
                                    onPress={() => setIsLinkSessionModalOpen(true)}
                                >
                                    <Text style={styles.primaryActionBtnText}>
                                        Seleccionar Sesión de la Clienta
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {/* 2. SECCIÓN DE DISEÑO, MOODBOARD Y BIBLIOTECA (MÓDULO 04) */}
                {(detailActiveTab === 'resumen' || detailActiveTab === 'concepto') && (
                    <CreationMoodboardTab
                        creation={selectedCreation}
                        compactMode={detailActiveTab === 'resumen'}
                        onOpenFullConceptTab={() => setDetailActiveTab('concepto')}
                    />
                )}

                {/* 3. SECCIÓN DE PATRONAJE CAD (REGLAS 4, 5, 10, 11) */}
                {(detailActiveTab === 'resumen' || detailActiveTab === 'patronaje') && (
                    <View style={[styles.sectionCard, styles.patternCadSection]}>
                        <View style={styles.sectionCardHeader}>
                            <View>
                                <Text style={styles.sectionCardTitleGold}>3. PATRONAJE CAD PARAMÉTRICO</Text>
                                <Text style={styles.sectionCardSubtitle}>
                                    Desacoplado y opcional · Trazado matemático e inmutable
                                </Text>
                            </View>

                            <TouchableOpacity
                                style={styles.openCadBtn}
                                onPress={() => setIsCadOpen(true)}
                                activeOpacity={0.85}
                            >
                                <Text style={styles.openCadBtnText}>
                                    {selectedCreation.active_pattern_execution_id
                                        ? '📐 Abrir Taller CAD / Fitting'
                                        : '✂️ Generar Patrón CAD'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* PUENTE NO INTRUSIVO M04 → M02: Referencia Sartorial y Cromática para Patronaje */}
                        {cadMoodboardRef && (
                            <View
                                style={{
                                    backgroundColor: '#FAF7F2',
                                    borderWidth: 1,
                                    borderColor: '#E5DCCB',
                                    borderRadius: 10,
                                    padding: 12,
                                    marginBottom: 14,
                                }}
                            >
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                                    <Text style={{ fontSize: 10, fontWeight: '700', letterSpacing: 1, color: '#8A6A4A' }}>
                                        ✦ ARQUITECTURA SARTORIAL M04 (REFERENCIA DE DISEÑO PARA TRAZADO CAD)
                                    </Text>
                                    <TouchableOpacity onPress={() => setDetailActiveTab('concepto')}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#A78350' }}>
                                            Ver Moodboard M04 ({cadMoodboardRef.status === 'approved' ? '✓ Aprobado' : 'En composición'}) →
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14, marginTop: 8, alignItems: 'center' }}>
                                    <Text style={{ fontSize: 12, color: '#171411' }}>
                                        <Text style={{ fontWeight: '700', color: '#5C5248' }}>Silueta:</Text> {silhouetteLabel}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#171411' }}>
                                        <Text style={{ fontWeight: '700', color: '#5C5248' }}>Escote:</Text> {necklineLabel}
                                    </Text>
                                    <Text style={{ fontSize: 12, color: '#171411' }}>
                                        <Text style={{ fontWeight: '700', color: '#5C5248' }}>Manga:</Text> {sleeveLabel}
                                    </Text>
                                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                                        <Text style={{ fontSize: 11, fontWeight: '700', color: '#5C5248' }}>Paleta:</Text>
                                        {(cadMoodboardRef.color_palette || []).map((sw) => (
                                            <View
                                                key={sw.id}
                                                style={{
                                                    width: 16,
                                                    height: 16,
                                                    borderRadius: 8,
                                                    backgroundColor: sw.hex,
                                                    borderWidth: 1,
                                                    borderColor: '#C5A880',
                                                }}
                                            />
                                        ))}
                                    </View>
                                </View>
                            </View>
                        )}

                        {selectedCreation.active_pattern ? (
                            <View style={styles.activePatternCard}>
                                <View style={styles.activePatternRow}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.activePatternLabel}>PATRÓN CAD ASOCIADO</Text>
                                        <Text style={styles.activePatternVersion}>
                                            {GARMENT_TYPE_LABELS[selectedCreation.active_pattern.garment_type] ||
                                                GARMENT_PACKAGES[selectedCreation.active_pattern.garment_type]?.name ||
                                                'Chaqueta Sastre de Alta Costura'}
                                        </Text>
                                        <Text style={styles.activePatternSubVersion}>
                                            Versión {selectedCreation.active_pattern.version_label} · APROBADO · VIGENTE
                                        </Text>
                                    </View>
                                    <View style={styles.activePatternStatusBadge}>
                                        <Text style={styles.activePatternStatusText}>
                                            {selectedCreation.active_pattern.status.toUpperCase()}
                                        </Text>
                                    </View>
                                </View>

                                <Text style={styles.activePatternDate}>
                                    Generado: {new Date(selectedCreation.active_pattern.created_at).toLocaleString()}
                                </Text>

                                {/* Linaje histórico de ejecuciones vinculadas */}
                                <View style={styles.lineageBox}>
                                    <View style={styles.lineageHeaderRow}>
                                        <Text style={styles.lineageTitle}>
                                            HISTORIAL TÉCNICO · {selectedCreation.total_executions_count || selectedCreation.pattern_executions?.length || 1} EJECUCIONES
                                        </Text>
                                        <View style={styles.patternCounterPill}>
                                            <Text style={styles.patternCounterPillText}>
                                                1 Patrón CAD · {selectedCreation.total_executions_count || selectedCreation.pattern_executions?.length || 1} ejecuciones
                                            </Text>
                                        </View>
                                    </View>
                                    {(selectedCreation.pattern_executions || []).map((exec) => (
                                        <View key={exec.id} style={styles.lineageItem}>
                                            <View style={[styles.lineageDot, exec.id === selectedCreation.active_pattern_execution_id && styles.lineageDotActive]} />
                                            <View style={{ flex: 1 }}>
                                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                                    <Text style={styles.lineageItemTitle}>
                                                        {exec.version_label} · {GARMENT_TYPE_LABELS[exec.garment_type] || GARMENT_PACKAGES[exec.garment_type]?.name || exec.garment_type}
                                                    </Text>
                                                    {exec.id === selectedCreation.active_pattern_execution_id && (
                                                        <View style={styles.activeLeafBadge}>
                                                            <Text style={styles.activeLeafBadgeText}>ACTIVO · VIGENTE</Text>
                                                        </View>
                                                    )}
                                                </View>
                                                <Text style={styles.lineageItemMeta}>
                                                    Estado: {exec.status} · {new Date(exec.created_at).toLocaleDateString()}
                                                </Text>
                                                {exec.notes && (
                                                    <Text style={styles.lineageItemNotes} numberOfLines={2}>
                                                        {exec.notes}
                                                    </Text>
                                                )}
                                            </View>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ) : (
                            <View style={styles.emptyPatternBox}>
                                <Text style={styles.emptyPatternTitle}>
                                    Esta Creación no tiene ningún patrón CAD asociado
                                </Text>
                                <Text style={styles.emptyPatternText}>
                                    La diseñadora puede crear el patrón en cualquier momento haciendo clic en el botón superior. El patrón mantendrá su historial inmutable y no alterará ejecuciones históricas existentes.
                                </Text>
                            </View>
                        )}
                    </View>
                )}

                {/* 4. SECCIÓN DE FITTING & PRUEBAS (SECCIÓN 14) */}
                {(detailActiveTab === 'resumen' || detailActiveTab === 'fitting') && (
                    <View style={styles.sectionCard}>
                        <View style={styles.sectionCardHeader}>
                            <View>
                                <Text style={styles.sectionCardTitle}>4. FITTING & PRUEBAS DE VESTUARIO</Text>
                                <Text style={styles.sectionCardSubtitle}>
                                    Glasilla base, ajustes anatómicos y validación física
                                </Text>
                            </View>
                            <View style={styles.fittingStatusBadge}>
                                <Text style={styles.fittingStatusBadgeText}>
                                    {selectedCreation.status === 'approved' || selectedCreation.status === 'production' || selectedCreation.status === 'completed'
                                        ? '✓ FITTING APROBADO'
                                        : selectedCreation.status === 'fitting'
                                            ? 'EN PROCESO DE PRUEBA'
                                            : 'PENDIENTE DE FITTING'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.fittingContentBox}>
                            <View style={styles.fittingDetailRow}>
                                <Text style={styles.fittingDetailLabel}>GLASILLA DE PRUEBA:</Text>
                                <Text style={styles.fittingDetailValue}>Chaqueta Sastre Base · Retor de algodón</Text>
                            </View>
                            <View style={styles.fittingDetailRow}>
                                <Text style={styles.fittingDetailLabel}>HISTORIAL DE PRUEBAS:</Text>
                                <Text style={styles.fittingDetailValue}>
                                    2 pruebas registradas con clienta Laura Martínez
                                </Text>
                            </View>
                            <View style={styles.fittingDetailRow}>
                                <Text style={styles.fittingDetailLabel}>AJUSTES TÉCNICOS EFECTUADOS:</Text>
                                <Text style={styles.fittingDetailValue}>
                                    Sisa reducida 5 mm · Quiebre de solapa asentado · Caída de manga corregida
                                </Text>
                            </View>
                            <View style={styles.fittingDetailRow}>
                                <Text style={styles.fittingDetailLabel}>VERSIÓN RESULTANTE:</Text>
                                <Text style={styles.fittingDetailValueGold}>
                                    v1.1 (Aprobada por Katherine Carroll · Lista para corte definitivo)
                                </Text>
                            </View>
                        </View>
                    </View>
                )}

                {/* 5. SECCIÓN MATERIALES (MÓDULO 03: CATÁLOGO Y TELAS) */}
                {(detailActiveTab === 'resumen' || detailActiveTab === 'materiales') && (
                    <CreationMaterialsTab
                        creation={selectedCreation}
                        onProposalChange={setActiveProposal}
                    />
                )}

                {/* 6. SECCIÓN COTIZACIONES (MÓDULO 03: OFERTAS A4 E INMUTABILIDAD) */}
                {(detailActiveTab === 'resumen' || detailActiveTab === 'cotizaciones') && (
                    <CreationQuotesTab
                        creation={selectedCreation}
                        activeProposal={activeProposal}
                    />
                )}

                {/* 7. SECCIÓN CONFECCIÓN (MÓDULO 03: SEGUIMIENTO OPERATIVO DE TALLER) */}
                {(detailActiveTab === 'resumen' || detailActiveTab === 'confeccion') && (
                    <ProjectExecutionTab creation={selectedCreation} />
                )}

                {/* 8. SECCIÓN FINANZAS (MÓDULO 03: CONTROL DE ANTICIPOS Y SALDOS) */}
                {(detailActiveTab === 'resumen' || detailActiveTab === 'finanzas') && (
                    <FinancialControlTab creation={selectedCreation} />
                )}

                {/* 9. SECCIÓN BITÁCORA EDITORIAL & TRAZABILIDAD (MÓDULO 03: EVENTOS INMUTABLES) */}
                {(detailActiveTab === 'resumen' || detailActiveTab === 'bitacora') && (
                    <CreationLogbookTab creation={selectedCreation} />
                )}
            </View>
        </ScrollView>
    );
};
