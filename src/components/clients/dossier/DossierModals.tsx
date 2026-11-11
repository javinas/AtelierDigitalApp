// ==============================================================================
// COMPONENTE: CONTENEDOR UNIFICADO DE MODALES DEL EXPEDIENTE (ALTA COSTURA)
// Archivo: src/components/clients/dossier/DossierModals.tsx
// Atelier Digital · By Katherine Carroll
// ==============================================================================

import React, { useEffect, useMemo, useState } from 'react';
import { Image, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { colors } from '../../../theme/colors';
import { Client } from '../../../types/client';
import { MeasuredPerson } from '../../../types/personGroup';
import { MeasurementSession } from '../../../types/pattern/measurement';
import { MASTER_MEASUREMENT_CATALOG } from '../../../engine/pattern/catalog/masterCatalog';
import { AtelierGrandAnatomicalMannequin } from '../../pattern/AtelierGrandAnatomicalMannequin';
import { AtelierFastMeasurementCaptureModal } from '../../pattern/AtelierFastMeasurementCaptureModal';
import { PersonCreationCadWizardModal } from '../../pattern/PersonCreationCadWizardModal';
import { printA4MeasurementSheet } from '../../../utils/printMeasurementSheetHelper';
import { AnatomicalPerspective, BodyDemographicType } from '../../../engine/pattern/catalog/anatomicalMapping';
import { styles } from './clientDossierStyles';

const DEMOGRAPHIC_AVATARS: Record<string, any> = {
    woman: require('../../../../assets/mannequin_woman_real.jpg'),
    man: require('../../../../assets/mannequin_man_real.jpg'),
    child: require('../../../../assets/mannequin_woman_real.jpg'),
    teen: require('../../../../assets/mannequin_woman_real.jpg'),
};

interface DossierModalsProps {
    client: Client;
    sessions: MeasurementSession[];
    personMap: Map<string, MeasuredPerson>;
    formatDate: (dateStr?: string | null) => string;

    // Modal 1: Inspector Anatómico
    selectedSessionForView: MeasurementSession | null;
    onCloseInspector: () => void;

    // Modal 2: Comparador de Sesiones
    showComparisonModal: boolean;
    compareBaseSession: MeasurementSession | null;
    compareTargetSession: MeasurementSession | null;
    availableComparisonCandidates: MeasurementSession[];
    onCloseComparison: () => void;
    onSelectCompareTarget: (s: MeasurementSession) => void;
    onStartComparison: (s: MeasurementSession) => void;

    // Modal 3: Captura Rápida
    showFastCaptureModal: boolean;
    captureSubjectPerson: MeasuredPerson | null;
    captureDraftSession: MeasurementSession | null;
    onCloseFastCapture: () => void;
    onSessionSaved: () => void;
    onProceedToCadFromCapture: (session: MeasurementSession) => void;

    // Modal 4: Wizard CAD
    showCadWizardModal: boolean;
    cadWizardPerson: MeasuredPerson | null;
    cadWizardSessionId: string | null;
    onCloseCadWizard: () => void;
    onCadExecutionGenerated: () => void;
    onOpenCadWizard: (s: MeasurementSession) => void;
    onOpenFastCapture: (targetPerson: MeasuredPerson | null, draftSession: MeasurementSession | null) => void;
}

export const DossierModals: React.FC<DossierModalsProps> = ({
    client,
    sessions,
    personMap,
    formatDate,
    selectedSessionForView,
    onCloseInspector,
    showComparisonModal,
    compareBaseSession,
    compareTargetSession,
    availableComparisonCandidates,
    onCloseComparison,
    onSelectCompareTarget,
    onStartComparison,
    showFastCaptureModal,
    captureSubjectPerson,
    captureDraftSession,
    onCloseFastCapture,
    onSessionSaved,
    onProceedToCadFromCapture,
    showCadWizardModal,
    cadWizardPerson,
    cadWizardSessionId,
    onCloseCadWizard,
    onCadExecutionGenerated,
    onOpenCadWizard,
    onOpenFastCapture,
}) => {
    // Estados internos del Inspector Anatómico
    const [inspectorCategoryFilter, setInspectorCategoryFilter] = useState<string>('all');
    const [inspectorViewMode, setInspectorViewMode] = useState<'grid' | 'mannequin'>('grid');
    const [inspectorPerspective, setInspectorPerspective] = useState<AnatomicalPerspective>('front');
    const [inspectorSelectedCode, setInspectorSelectedCode] = useState<string | null>(null);
    const [inspectorMannequinMode, setInspectorMannequinMode] = useState<'full_body' | 'torso'>('full_body');
    const [inspectorDensityMode, setInspectorDensityMode] = useState<'all' | 'summary'>('all');
    const [inspectorDemographic, setInspectorDemographic] = useState<BodyDemographicType>('woman');

    // Demografía derivada para el maniquí
    const derivedInspectorDemographic = useMemo<BodyDemographicType>(() => {
        if (selectedSessionForView) {
            const p = selectedSessionForView.person_id ? personMap.get(selectedSessionForView.person_id) : null;
            const cat = p?.demographic_category;
            if (cat === 'boy' || cat === 'girl' || cat === 'man' || cat === 'woman') {
                return cat;
            }
        }
        return 'woman';
    }, [selectedSessionForView, personMap]);

    useEffect(() => {
        if (selectedSessionForView) {
            setInspectorDemographic(derivedInspectorDemographic);
            setInspectorMannequinMode('full_body');
            setInspectorDensityMode('all');
            setInspectorPerspective('front');
            setInspectorSelectedCode(null);
        }
    }, [selectedSessionForView?.id, derivedInspectorDemographic]);

    const inspectorMeasurementsMm = useMemo(() => {
        const res: Record<string, number> = {};
        if (selectedSessionForView?.values) {
            Object.entries(selectedSessionForView.values).forEach(([code, item]) => {
                if (item && typeof item.value_mm === 'number') {
                    res[code] = item.value_mm;
                }
            });
        }
        return res;
    }, [selectedSessionForView]);

    return (
        <>
            {/* MODAL 1: VISOR DETALLADO DE MEDIDAS DE UNA SESIÓN (REDISEÑO FASE B2 — B2-05) */}
            <Modal visible={Boolean(selectedSessionForView)} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { maxWidth: 780 }]}>
                        {selectedSessionForView && (() => {
                            const sessionPerson = selectedSessionForView.person_id
                                ? personMap.get(selectedSessionForView.person_id)
                                : null;
                            const isRectification =
                                selectedSessionForView.version_number > 1 ||
                                Boolean(selectedSessionForView.notes && selectedSessionForView.notes.includes('Rectificación'));
                            const avatar = sessionPerson
                                ? DEMOGRAPHIC_AVATARS[sessionPerson.demographic_category]
                                : require('../../../../assets/mannequin_woman_real.jpg');
                            const hasOtherSessions = selectedSessionForView.person_id
                                ? sessions.filter((s) => s.person_id === selectedSessionForView.person_id && s.id !== selectedSessionForView.id).length > 0
                                : sessions.filter((s) => !s.person_id && s.id !== selectedSessionForView.id).length > 0;

                            const filteredCatalog = MASTER_MEASUREMENT_CATALOG.filter((item) => {
                                if (inspectorCategoryFilter === 'all') return true;
                                return item.category === inspectorCategoryFilter;
                            });

                            return (
                                <>
                                    <View style={styles.modalHeader}>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                            <View style={styles.sessionAvatarWrap}>
                                                <Image source={avatar} style={styles.sessionAvatarImg} resizeMode="cover" />
                                            </View>
                                            <View style={{ marginLeft: 12, flex: 1 }}>
                                                <Text style={styles.modalSuper}>DETALLE ANATÓMICO DE LA SESIÓN · ALTA COSTURA</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                                    <Text style={styles.modalTitle}>
                                                        {sessionPerson ? sessionPerson.full_name : `${client.full_name} (Titular)`}
                                                    </Text>
                                                    {isRectification ? (
                                                        <View style={styles.rectificationBadge}>
                                                            <Text style={styles.rectificationBadgeText}>
                                                                🔄 Rectificación v{selectedSessionForView.version_number}
                                                            </Text>
                                                        </View>
                                                    ) : (
                                                        <View style={styles.versionBadgeClean}>
                                                            <Text style={styles.versionBadgeCleanText}>
                                                                v{selectedSessionForView.version_number}
                                                            </Text>
                                                        </View>
                                                    )}
                                                    <View
                                                        style={[
                                                            styles.statusTag,
                                                            selectedSessionForView.status === 'completed'
                                                                ? { backgroundColor: '#E8F5E9' }
                                                                : selectedSessionForView.status === 'verified'
                                                                ? { backgroundColor: '#E3F2FD' }
                                                                : { backgroundColor: '#FFF3E0' },
                                                        ]}
                                                    >
                                                        <Text
                                                            style={[
                                                                styles.statusTagText,
                                                                selectedSessionForView.status === 'completed'
                                                                    ? { color: '#2E7D32' }
                                                                    : selectedSessionForView.status === 'verified'
                                                                    ? { color: '#1565C0' }
                                                                    : { color: '#E65100' },
                                                            ]}
                                                        >
                                                            {selectedSessionForView.status === 'completed'
                                                                ? '🛡️ FINALIZADA'
                                                                : selectedSessionForView.status === 'verified'
                                                                ? '✅ VERIFICADA'
                                                                : '⏳ BORRADOR'}
                                                        </Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.sessionSubMeta}>
                                                    📅 Fecha de toma: {formatDate(selectedSessionForView.session_date)} · Sistema: {selectedSessionForView.unit_system?.toUpperCase() || 'CM'}
                                                    {sessionPerson?.reference_id ? ` · Ref: ${sessionPerson.reference_id}` : ''}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                            <TouchableOpacity
                                                onPress={() => printA4MeasurementSheet(client, sessionPerson || null, selectedSessionForView)}
                                                style={styles.printA4Btn}
                                                activeOpacity={0.8}
                                            >
                                                <Text style={styles.printA4BtnText}>🖨️ Ficha A4</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                onPress={onCloseInspector}
                                                style={styles.modalCloseBtn}
                                            >
                                                <Text style={styles.modalCloseBtnText}>✕</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>

                                    {/* Notas de la Sesión si existen */}
                                    {selectedSessionForView.notes ? (
                                        <View style={styles.inspectorNotesBox}>
                                            <Text style={styles.inspectorNotesLabel}>OBSERVACIONES DE LA TOMA:</Text>
                                            <Text style={styles.inspectorNotesText}>“{selectedSessionForView.notes}”</Text>
                                        </View>
                                    ) : null}

                                    {/* Selector de Modo de Visualización: Tabla vs Maniquí */}
                                    <View style={styles.inspectorModeToggleRow}>
                                        <TouchableOpacity
                                            style={[styles.inspectorModeBtn, inspectorViewMode === 'grid' && styles.inspectorModeBtnActive]}
                                            onPress={() => setInspectorViewMode('grid')}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={[styles.inspectorModeBtnText, inspectorViewMode === 'grid' && styles.inspectorModeBtnTextActive]}>
                                                📋 Tabla de Cotas ({Object.keys(selectedSessionForView.values || {}).length})
                                            </Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.inspectorModeBtn, inspectorViewMode === 'mannequin' && styles.inspectorModeBtnActive]}
                                            onPress={() => setInspectorViewMode('mannequin')}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={[styles.inspectorModeBtnText, inspectorViewMode === 'mannequin' && styles.inspectorModeBtnTextActive]}>
                                                👤 Ver en Maniquí Anatómico
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    {inspectorViewMode === 'grid' ? (
                                        <>
                                            {/* Selector de Categorías Anatómicas */}
                                            <View style={styles.inspectorCategoryBar}>
                                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.inspectorPillsScroll}>
                                                    {[
                                                        { id: 'all', label: 'Todas las medidas' },
                                                        { id: 'torso_body', label: 'Torso y Busto' },
                                                        { id: 'arms_sleeves', label: 'Brazos y Mangas' },
                                                        { id: 'legs_pants', label: 'Piernas y Falda' },
                                                        { id: 'fit_adjustment', label: 'Ajuste y Holguras' },
                                                        { id: 'garment_design', label: 'Diseño de Prenda' },
                                                    ].map((cat) => (
                                                        <TouchableOpacity
                                                            key={cat.id}
                                                            style={[
                                                                styles.inspectorPill,
                                                                inspectorCategoryFilter === cat.id && styles.inspectorPillActive,
                                                            ]}
                                                            onPress={() => setInspectorCategoryFilter(cat.id)}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.inspectorPillText,
                                                                    inspectorCategoryFilter === cat.id && styles.inspectorPillTextActive,
                                                                ]}
                                                            >
                                                                {cat.label}
                                                            </Text>
                                                        </TouchableOpacity>
                                                    ))}
                                                </ScrollView>
                                            </View>

                                            <ScrollView style={{ maxHeight: 420, padding: 14 }}>
                                                <View style={styles.measGrid}>
                                                    {filteredCatalog.map((item) => {
                                                        const valItem = selectedSessionForView.values?.[item.code];
                                                        const valMm = valItem?.value_mm;
                                                        const isFilled = typeof valMm === 'number' && valMm > 0;
                                                        const valDisplay = isFilled
                                                            ? selectedSessionForView.unit_system === 'in'
                                                                ? `${(valMm / 25.4).toFixed(2)} in`
                                                                : `${(valMm / 10).toFixed(1)} cm`
                                                            : '—';

                                                        return (
                                                            <View key={item.code} style={[styles.measItem, isFilled && styles.measItemFilled]}>
                                                                <Text style={styles.measItemName}>{item.name}</Text>
                                                                <Text style={[styles.measItemValue, isFilled && styles.measItemValueFilled]}>
                                                                    {valDisplay}
                                                                </Text>
                                                                {isFilled && valItem && (
                                                                    <View style={styles.measItemMetaRow}>
                                                                        {valItem.side && valItem.side !== 'none' && (
                                                                            <View style={styles.measItemBadge}>
                                                                                <Text style={styles.measItemBadgeText}>
                                                                                    {valItem.side === 'left' ? 'Izq' : 'Der'}
                                                                                </Text>
                                                                            </View>
                                                                        )}
                                                                        <View style={styles.measItemBadge}>
                                                                            <Text style={styles.measItemBadgeText}>
                                                                                {valItem.source === 'calculated' ? 'Calculada' : 'Directa'}
                                                                            </Text>
                                                                        </View>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        );
                                                    })}
                                                </View>
                                            </ScrollView>
                                        </>
                                    ) : (
                                        <View style={styles.inspectorMannequinContainer}>
                                            <AtelierGrandAnatomicalMannequin
                                                measurementsMm={inspectorMeasurementsMm}
                                                session={selectedSessionForView}
                                                clientName={sessionPerson?.full_name || client.full_name}
                                                referenceProfileLabel={sessionPerson ? `Alumno / Beneficiario: ${sessionPerson.full_name}` : 'Titular'}
                                                demographic={inspectorDemographic}
                                                onDemographicChange={setInspectorDemographic}
                                                perspective={inspectorPerspective}
                                                onPerspectiveChange={setInspectorPerspective}
                                                selectedMeasureCode={inspectorSelectedCode}
                                                onSelectMeasureCode={(code: string | null) => setInspectorSelectedCode(code)}
                                                viewMode={inspectorMannequinMode}
                                                onViewModeChange={setInspectorMannequinMode}
                                                densityMode={inspectorDensityMode}
                                                onDensityModeChange={setInspectorDensityMode}
                                            />
                                        </View>
                                    )}

                                    <View style={styles.modalFooter}>
                                        <TouchableOpacity
                                            onPress={() => {
                                                const targetSession = selectedSessionForView;
                                                onCloseInspector();
                                                onOpenCadWizard(targetSession);
                                            }}
                                            style={styles.modalCadBtn}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.modalCadBtnText}>✂️ Iniciar Creación CAD con esta Sesión</Text>
                                        </TouchableOpacity>

                                        {selectedSessionForView.status === 'draft' && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const draftSess = selectedSessionForView;
                                                    onCloseInspector();
                                                    const targetPerson = draftSess.person_id ? personMap.get(draftSess.person_id) || null : null;
                                                    onOpenFastCapture(targetPerson, draftSess);
                                                }}
                                                style={styles.modalDraftResumeBtn}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.modalDraftResumeBtnText}>✏️ Reanudar Captura</Text>
                                            </TouchableOpacity>
                                        )}

                                        {hasOtherSessions && (
                                            <TouchableOpacity
                                                onPress={() => {
                                                    const s = selectedSessionForView;
                                                    onCloseInspector();
                                                    onStartComparison(s);
                                                }}
                                                style={styles.modalCompareBtn}
                                                activeOpacity={0.85}
                                            >
                                                <Text style={styles.modalCompareBtnText}>⚖️ Comparar con otra sesión</Text>
                                            </TouchableOpacity>
                                        )}

                                        <TouchableOpacity
                                            onPress={onCloseInspector}
                                            style={styles.modalDoneBtn}
                                        >
                                            <Text style={styles.modalDoneBtnText}>Cerrar Visor</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                </View>
            </Modal>

            {/* MODAL 1B: COMPARADOR HISTÓRICO DE MEDIDAS (FASE B2 — B2-06, B2-11, B2-12, B2-13) */}
            <Modal visible={showComparisonModal && Boolean(compareBaseSession) && Boolean(compareTargetSession)} animationType="fade" transparent>
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalCard, { maxWidth: 840 }]}>
                        {compareBaseSession && compareTargetSession && (() => {
                            const person = compareBaseSession.person_id
                                ? personMap.get(compareBaseSession.person_id)
                                : null;
                            const subjectName = person ? person.full_name : `${client.full_name} (Titular)`;

                            // Calcular medidas comparables
                            let comparableCount = 0;
                            const comparisonRows = MASTER_MEASUREMENT_CATALOG.map((item) => {
                                const baseValItem = compareBaseSession.values?.[item.code];
                                const targetValItem = compareTargetSession.values?.[item.code];
                                const baseMm = baseValItem?.value_mm;
                                const targetMm = targetValItem?.value_mm;
                                const hasBase = typeof baseMm === 'number' && baseMm > 0;
                                const hasTarget = typeof targetMm === 'number' && targetMm > 0;

                                if (!hasBase && !hasTarget) return null;

                                if (hasBase && hasTarget) {
                                    comparableCount++;
                                    const deltaMm = targetMm - baseMm;
                                    const deltaCm = (deltaMm / 10).toFixed(1);
                                    const sign = deltaMm > 0 ? `+${deltaCm}` : deltaMm < 0 ? `${deltaCm}` : '0.0';
                                    return {
                                        code: item.code,
                                        name: item.name,
                                        category: item.category,
                                        baseDisplay: `${(baseMm / 10).toFixed(1)} cm`,
                                        targetDisplay: `${(targetMm / 10).toFixed(1)} cm`,
                                        deltaDisplay: `${sign} cm`,
                                        deltaType: deltaMm > 0 ? 'pos' : deltaMm < 0 ? 'neg' : 'zero',
                                        isComparable: true,
                                    };
                                }

                                return {
                                    code: item.code,
                                    name: item.name,
                                    category: item.category,
                                    baseDisplay: hasBase ? `${(baseMm / 10).toFixed(1)} cm` : '—',
                                    targetDisplay: hasTarget ? `${(targetMm / 10).toFixed(1)} cm` : '—',
                                    deltaDisplay: hasBase ? '○ Ausente en comparada' : '○ Ausente en base',
                                    deltaType: 'missing',
                                    isComparable: false,
                                };
                            }).filter(Boolean);

                            return (
                                <>
                                    <View style={styles.modalHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.modalSuper}>ANÁLISIS COMPARATIVO ANATÓMICO · ALTA COSTURA</Text>
                                            <Text style={styles.modalTitle}>Comparador Histórico: {subjectName}</Text>
                                            <Text style={styles.compModalNotice}>
                                                Comparación estricta entre sesiones inmutables de la misma persona.
                                                Diferencia: Δ = Comparada (v{compareTargetSession.version_number}) − Base (v{compareBaseSession.version_number}).
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            onPress={onCloseComparison}
                                            style={styles.modalCloseBtn}
                                        >
                                            <Text style={styles.modalCloseBtnText}>✕</Text>
                                        </TouchableOpacity>
                                    </View>

                                    {/* Selector de Sesión Objetivo a Comparar */}
                                    <View style={styles.compSelectorBar}>
                                        <Text style={styles.compSelectorLabel}>COMPARAR CONTRA SESIÓN:</Text>
                                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.compCandidateScroll}>
                                            {availableComparisonCandidates.map((cand) => {
                                                const isSelected = compareTargetSession.id === cand.id;
                                                return (
                                                    <TouchableOpacity
                                                        key={cand.id}
                                                        style={[styles.compCandidatePill, isSelected && styles.compCandidatePillActive]}
                                                        onPress={() => onSelectCompareTarget(cand)}
                                                    >
                                                        <Text style={[styles.compCandidateText, isSelected && styles.compCandidateTextActive]}>
                                                            v{cand.version_number} ({formatDate(cand.session_date)}) · {cand.status.toUpperCase()}
                                                        </Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </ScrollView>
                                    </View>

                                    {/* Tabla Comparativa de Medidas */}
                                    <ScrollView style={{ maxHeight: 420, paddingHorizontal: 14, paddingTop: 10 }}>
                                        <View style={styles.compTableHeaderRow}>
                                            <Text style={[styles.compColHeader, { flex: 2.6 }]}>MEDIDA / PUNTO ANATÓMICO</Text>
                                            <Text style={[styles.compColHeader, { flex: 1.4, textAlign: 'center' }]}>
                                                BASE (v{compareBaseSession.version_number})
                                            </Text>
                                            <Text style={[styles.compColHeader, { flex: 1.4, textAlign: 'center' }]}>
                                                COMPARADA (v{compareTargetSession.version_number})
                                            </Text>
                                            <Text style={[styles.compColHeader, { flex: 1.8, textAlign: 'right' }]}>
                                                DIFERENCIA (Δ)
                                            </Text>
                                        </View>

                                        <View style={styles.compTableBody}>
                                            {comparisonRows.map((row: any) => (
                                                <View key={row.code} style={styles.compTableRow}>
                                                    <View style={[styles.compTableCell, { flex: 2.6 }]}>
                                                        <Text style={styles.compRowName}>{row.name}</Text>
                                                        <Text style={styles.compRowCode}>{row.code}</Text>
                                                    </View>

                                                    <View style={[styles.compTableCell, { flex: 1.4, alignItems: 'center' }]}>
                                                        <Text style={styles.compRowBaseVal}>{row.baseDisplay}</Text>
                                                    </View>

                                                    <View style={[styles.compTableCell, { flex: 1.4, alignItems: 'center' }]}>
                                                        <Text style={styles.compRowTargetVal}>{row.targetDisplay}</Text>
                                                    </View>

                                                    <View style={[styles.compTableCell, { flex: 1.8, alignItems: 'flex-end' }]}>
                                                        <View
                                                            style={[
                                                                styles.compDeltaBadge,
                                                                row.deltaType === 'pos'
                                                                    ? styles.compDeltaBadgePos
                                                                    : row.deltaType === 'neg'
                                                                    ? styles.compDeltaBadgeNeg
                                                                    : row.deltaType === 'zero'
                                                                    ? styles.compDeltaBadgeZero
                                                                    : styles.compDeltaBadgeMissing,
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.compDeltaText,
                                                                    row.deltaType === 'pos'
                                                                        ? styles.compDeltaTextPos
                                                                        : row.deltaType === 'neg'
                                                                        ? styles.compDeltaTextNeg
                                                                        : row.deltaType === 'zero'
                                                                        ? styles.compDeltaTextZero
                                                                        : styles.compDeltaTextMissing,
                                                                ]}
                                                            >
                                                                {row.deltaDisplay}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </View>
                                            ))}
                                        </View>
                                    </ScrollView>

                                    <View style={styles.modalFooter}>
                                        <Text style={styles.compFooterSummary}>
                                            Total: <Text style={{ fontWeight: '700' }}>{comparableCount}</Text> medidas cotejadas entre versiones
                                        </Text>

                                        <TouchableOpacity
                                            onPress={onCloseComparison}
                                            style={styles.modalDoneBtn}
                                        >
                                            <Text style={styles.modalDoneBtnText}>Cerrar Comparador</Text>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            );
                        })()}
                    </View>
                </View>
            </Modal>

            {/* MODAL FASE C: CAPTURA RÁPIDA DE MEDIDAS ANATÓMICAS */}
            {showFastCaptureModal && (
                <AtelierFastMeasurementCaptureModal
                    visible={showFastCaptureModal}
                    client={client}
                    person={captureSubjectPerson}
                    existingDraftSession={captureDraftSession}
                    onClose={onCloseFastCapture}
                    onSessionSaved={onSessionSaved}
                    onProceedToCad={onProceedToCadFromCapture}
                />
            )}

            {/* MODAL FASE C: PUENTE ENTRE MEDIDAS, CREACIÓN Y PATRONAJE CAD */}
            {showCadWizardModal && (
                <PersonCreationCadWizardModal
                    visible={showCadWizardModal}
                    client={client}
                    person={cadWizardPerson}
                    initialSessionId={cadWizardSessionId}
                    onClose={onCloseCadWizard}
                    onCadExecutionGenerated={onCadExecutionGenerated}
                />
            )}
        </>
    );
};
