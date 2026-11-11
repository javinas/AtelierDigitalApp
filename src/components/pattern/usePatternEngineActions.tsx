import React, { useRef } from 'react';
import { Platform, Alert, View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { executePatternEngine } from '../../engine/pattern/engine';
import { exportPatternToDxf, validateGeometryForCadExport } from '../../engine/pattern/export/dxfExporter';
import { generateTiledPrintHtml } from '../../engine/pattern/export/pdfTiledExporter';
import { exportPatternToSvg } from '../../engine/pattern/export/svgExporter';
import {
    savePatternExecution,
    updatePatternStatus,
    approvePatternExecution,
} from '../../services/patternService';
import { linkPatternExecutionToCreation, updateCreation } from '../../services/creationService';
import { evaluateFittingTransition, evaluateApprovalTransition } from './creationFlow/creationFlowModel';
import { GARMENT_PACKAGES } from '../../engine/pattern/catalog/garmentPackages';
import { MEASUREMENT_MAP } from '../../engine/pattern/catalog/masterCatalog';
import { PatternExecution, PatternStatus } from '../../types/pattern/pattern';
import { styles } from './patternModuleStyles';
import { PatternStudioState } from './usePatternStudioState';

export interface UsePatternEngineActionsParams {
    state: PatternStudioState;
    initialCreationId?: string | null;
}

export function usePatternEngineActions({ state, initialCreationId }: UsePatternEngineActionsParams) {
    const {
        role,
        activeWorkflow,
        selectedClient,
        selectedSession,
        selectedCreation,
        setSelectedCreation,
        setClientCreations,
        garmentType,
        selectedTemplate,
        selectedEaseProfile,
        designParams,
        activeMeasurementsMm,
        templateRequirementsCheck,
        templateMeasurementDiagnostic,
        validationChecklist,
        currentExecution,
        setCurrentExecution,
        geometryResult,
        setGeometryResult,
        validationResult,
        setValidationResult,
        patternStatus,
        setPatternStatus,
        executionHistory,
        setExecutionHistory,
        setLastGeneratedSessionId,
        setAllowEstimatedGeneration,
        setShowEstimatedModal,
        setIsGenerating,
        setStatusMessage,
        setLastExportInfo,
        setIsApprovalConfirmOpen,
        allowEstimatedGeneration,
        freePatternProfileLabel,
        selectedReferenceProfileCode,
        setActiveStudioTab,
    } = state;

    const generatingRef = useRef(false);
    const approvingRef = useRef(false);

    // Vincula la ejecución a la creación en BD y, SOLO tras confirmarlo, actualiza en memoria
    // la creación (active_pattern_execution_id) y el historial en el mismo lote de render.
    // Así el efecto de sincronización siempre resuelve la ejecución activa y nunca devuelve null.
    const commitActiveExecution = async (creationId: string | null, exec: PatternExecution): Promise<string | null> => {
        if (creationId) {
            const linkRes = await linkPatternExecutionToCreation(creationId, exec.id);
            if (!linkRes.success) {
                return linkRes.error || 'No se pudo vincular el patrón a la creación.';
            }
            const linked: PatternExecution = { ...exec, creation_id: creationId };
            setSelectedCreation((prev) =>
                prev && prev.id === creationId ? { ...prev, active_pattern_execution_id: exec.id } : prev
            );
            setClientCreations((prev) =>
                prev.map((c) => (c.id === creationId ? { ...c, active_pattern_execution_id: exec.id } : c))
            );
            setCurrentExecution(linked);
            setExecutionHistory((prev) => [linked, ...prev.filter((e) => e.id !== linked.id)]);
        } else {
            setCurrentExecution(exec);
            setExecutionHistory((prev) => [exec, ...prev.filter((e) => e.id !== exec.id)]);
        }
        return null;
    };

    const handleGeneratePattern = async (bypassEstimatedConfirmation = false) => {
        if (generatingRef.current) return;
        if (!garmentType) {
            setStatusMessage({
                text: 'Debe vincular una categoría técnica de prenda a la creación antes de trazar el patrón.',
                type: 'error',
            });
            return;
        }

        if (activeWorkflow === 'creation_pattern' && selectedCreation) {
            if (selectedClient && selectedCreation.client_id !== selectedClient.id) {
                setStatusMessage({
                    text: 'Inconsistencia de contexto: La creación no pertenece a la clienta activa.',
                    type: 'error',
                });
                return;
            }
        }

        if (activeWorkflow !== 'free_pattern') {
            if (!selectedClient) {
                setStatusMessage({ text: 'Seleccione una clienta antes de continuar.', type: 'error' });
                return;
            }
            if (!selectedSession) {
                setStatusMessage({
                    text: 'La clienta no posee una sesión de medidas registrada. Por favor tome las medidas primero.',
                    type: 'error',
                });
                return;
            }

            // Regla 2: Consistencia cliente-sesión
            if (selectedSession.client_id !== selectedClient.id) {
                setStatusMessage({
                    text: 'Inconsistencia de titularidad: La sesión de medidas no pertenece a la clienta seleccionada.',
                    type: 'error',
                });
                return;
            }

            // Regla 2: No generar patrón definitivo desde borrador o sesión archivada
            if (selectedSession.status === 'draft') {
                setStatusMessage({
                    text: 'La sesión seleccionada está en estado "Borrador". Debe finalizar o verificar la sesión de medidas antes de generar un patrón definitivo de alta costura.',
                    type: 'error',
                });
                return;
            }
            if (selectedSession.status === 'archived') {
                setStatusMessage({
                    text: 'La sesión seleccionada está archivada y no permite generar nuevos patrones definitivos.',
                    type: 'error',
                });
                return;
            }

            // Bloqueo estricto si existen medidas obligatorias no resueltas (sin registro y sin cálculo C10)
            if (templateMeasurementDiagnostic.hasUnresolved) {
                const missingNames = templateMeasurementDiagnostic.unresolved
                    .map((item) => `${item.name} (${item.code})`)
                    .join(', ');
                setStatusMessage({
                    text: `Generación bloqueada: La plantilla seleccionada ("${selectedTemplate?.name}" v${selectedTemplate?.version}) exige medidas no registradas y sin cálculo derivado posible: ${missingNames}. Ingrese las medidas antes de ejecutar el motor.`,
                    type: 'error',
                });
                return;
            }

            // Control de medidas estimadas: si hay estimaciones y no han sido confirmadas explícitamente por la diseñadora
            if (templateMeasurementDiagnostic.hasEstimated && !allowEstimatedGeneration && !bypassEstimatedConfirmation) {
                setShowEstimatedModal(true);
                return;
            }
        }

        // REGLA 6: Bloquear generación si faltan medidas exigidas por la plantilla seleccionada
        if (!templateRequirementsCheck.valid) {
            if (!allowEstimatedGeneration && !bypassEstimatedConfirmation) {
                const missingNames = templateRequirementsCheck.missing
                    .map((c) => MEASUREMENT_MAP[c]?.name || c)
                    .join(', ');
                setStatusMessage({
                    text: `Generación bloqueada: La plantilla seleccionada ("${selectedTemplate?.name}" v${selectedTemplate?.version}) exige ${templateRequirementsCheck.missing.length} medida(s) obligatoria(s) faltante(s) en la clienta: ${missingNames}. Ingrese las medidas antes de ejecutar el motor.`,
                    type: 'error',
                });
                return;
            }
        }

        generatingRef.current = true;
        setIsGenerating(true);
        setStatusMessage(null);

        try {
            const measurementsToUse = (activeWorkflow !== 'free_pattern' && templateMeasurementDiagnostic.hasEstimated)
                ? templateMeasurementDiagnostic.resolvedMeasurementsMm
                : activeMeasurementsMm;

            const engineOutput = executePatternEngine({
                garmentType,
                measurementsMm: measurementsToUse,
                ease: selectedEaseProfile,
                designParameters: designParams,
            });

            setGeometryResult(engineOutput.geometryResult);
            setValidationResult(engineOutput.validationResult);

            if (engineOutput.success) {
                setPatternStatus('generated');
                setLastGeneratedSessionId(selectedSession?.id || null);
                setAllowEstimatedGeneration(false);

                const isRealUuid =
                    Boolean(selectedTemplate?.id) &&
                    !selectedTemplate?.id.startsWith('fallback_') &&
                    !selectedTemplate?.id.startsWith('local_') &&
                    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
                        selectedTemplate!.id
                    );

                const resolvedClientId = activeWorkflow === 'free_pattern' ? null : (selectedClient ? selectedClient.id : null);
                const resolvedSessionId = activeWorkflow === 'free_pattern' ? null : (selectedSession?.id || null);
                const resolvedCreationId = (activeWorkflow === 'creation_pattern' && selectedCreation?.id)
                    ? selectedCreation.id
                    : (activeWorkflow === 'free_pattern' ? null : (initialCreationId || null));

                if (!isRealUuid && activeWorkflow !== 'creation_pattern') {
                    const localBaseExec: PatternExecution = {
                        id: `local_base_${Date.now()}`,
                        client_id: resolvedClientId,
                        session_id: resolvedSessionId,
                        creation_id: resolvedCreationId,
                        garment_type: garmentType,
                        version_label: selectedTemplate ? `v${selectedTemplate.version}` : 'v1.0',
                        engine_version: engineOutput.engineVersion,
                        status: 'generated',
                        measurement_snapshot: engineOutput.resolvedMeasurementsMm,
                        ease_profile_snapshot: selectedEaseProfile,
                        design_parameters: designParams,
                        seam_allowance_default_mm: designParams.seam_allowance_default_mm || 10,
                        geometry_result: engineOutput.geometryResult,
                        validation_results: engineOutput.validationResult,
                        measurement_provenance: templateMeasurementDiagnostic.allItems.reduce((acc, item) => {
                            if (item.status !== 'unresolved') {
                                acc[item.code] = item.status;
                            }
                            return acc;
                        }, {} as Record<string, 'real' | 'calculated' | 'estimated'>),
                        has_estimated_measurements: templateMeasurementDiagnostic.hasEstimated,
                        template_id: selectedTemplate?.id || null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    };
                    const localErr = await commitActiveExecution(resolvedCreationId, localBaseExec);
                    if (localErr) {
                        setStatusMessage({ text: `El patrón se calculó pero no se pudo vincular: ${localErr}. Pulse de nuevo para reintentar.`, type: 'error' });
                        return;
                    }
                    const originLabel = activeWorkflow === 'free_pattern'
                        ? 'Patrón Libre trazado en el Banco Global.'
                        : activeWorkflow === 'direct_pattern'
                        ? 'Patronaje Directo trazado a medida.'
                        : 'Patrón asociado a Creación trazado con éxito.';
                    setStatusMessage({
                        text: `✓ ${originLabel} (${engineOutput.geometryResult.pieces.length} piezas geométricas calculadas en mm).`,
                        type: 'success',
                    });
                } else {
                    const saveRes = await savePatternExecution({
                        clientId: resolvedClientId,
                        sessionId: resolvedSessionId,
                        garmentType,
                        versionLabel: selectedTemplate ? `v${selectedTemplate.version}` : 'v1.0',
                        engineVersion: engineOutput.engineVersion,
                        measurementSnapshot: engineOutput.resolvedMeasurementsMm,
                        easeProfileSnapshot: selectedEaseProfile,
                        designParameters: designParams,
                        geometryResult: engineOutput.geometryResult,
                        validationResults: engineOutput.validationResult,
                        templateId: isRealUuid ? selectedTemplate!.id : null,
                        creationId: resolvedCreationId,
                    });
                    if (saveRes.success && saveRes.execution) {
                        const commitErr = await commitActiveExecution(resolvedCreationId, saveRes.execution);
                        if (commitErr) {
                            setStatusMessage({
                                text: `El patrón se guardó pero no se pudo vincular a la creación: ${commitErr}. Pulse de nuevo para reintentar.`,
                                type: 'error',
                            });
                            return;
                        }
                        const originLabel = activeWorkflow === 'free_pattern'
                            ? 'Patrón Libre guardado en el Banco Global.'
                            : activeWorkflow === 'direct_pattern'
                            ? 'Patronaje Directo guardado con éxito.'
                            : 'Patrón asociado a Creación guardado con éxito.';
                        setStatusMessage({
                            text: `✓ ${originLabel} (${engineOutput.geometryResult.pieces.length} piezas geométricas).`,
                            type: 'success',
                        });
                    } else {
                        setStatusMessage({
                            text: `No se pudo guardar el patrón: ${saveRes.error || 'error desconocido'}. Pulse de nuevo para reintentar.`,
                            type: 'error',
                        });
                    }
                }
            } else {
                setPatternStatus('needs_revision');
                setStatusMessage({
                    text: `El motor no pudo completar el trazo. Faltan ${engineOutput.validationResult.missingRequiredMeasurements.length} medidas obligatorias.`,
                    type: 'error',
                });
            }
        } catch (err: any) {
            setStatusMessage({ text: `Error inesperado: ${err?.message || err}`, type: 'error' });
        } finally {
            generatingRef.current = false;
            setIsGenerating(false);
        }
    };

    const handleSendToFitting = async () => {
        if (role === 'client') {
            setStatusMessage({ text: 'Acción restringida: El perfil clienta no dispone de permisos de taller.', type: 'error' });
            return;
        }
        const fittingGate = evaluateFittingTransition({
            role,
            currentExecution,
            creation: selectedCreation,
            executions: executionHistory,
            isCreationFlow: activeWorkflow === 'creation_pattern',
        });
        if (!fittingGate.allowed || !currentExecution) {
            setStatusMessage({
                text: fittingGate.reason === 'not_active_execution'
                    ? 'El patrón mostrado no es el patrón activo vinculado a esta creación. Regenere o seleccione la ejecución activa antes de enviar a Fitting.'
                    : 'No hay un patrón guardado para enviar a Fitting. Genere el patrón y confirme su guardado primero.',
                type: 'error',
            });
            return;
        }

        if (currentExecution.id.startsWith('local_')) {
            setPatternStatus('pending_fitting');
            const updated = { ...currentExecution, status: 'pending_fitting' as PatternStatus };
            setCurrentExecution(updated);
            setExecutionHistory((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            setStatusMessage({
                text: 'Patrón en prueba de vestuario ("pending_fitting"). Puede registrar ajustes de confección.',
                type: 'info',
            });
            return;
        }

        const res = await updatePatternStatus(currentExecution.id, 'pending_fitting');
        if (res.success) {
            setPatternStatus('pending_fitting');
            const updated = { ...currentExecution, status: 'pending_fitting' as PatternStatus };
            setCurrentExecution(updated);
            setExecutionHistory((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
            if (activeWorkflow === 'creation_pattern' && selectedCreation) {
                setSelectedCreation((prev) =>
                    prev ? { ...prev, status: 'fitting', active_pattern_execution_id: updated.id } : null
                );
                setClientCreations((prev) =>
                    prev.map((c) =>
                        c.id === selectedCreation.id
                            ? { ...c, status: 'fitting', active_pattern_execution_id: updated.id }
                            : c
                    )
                );
                try {
                    await updateCreation(selectedCreation.id, {
                        status: 'fitting',
                        active_pattern_execution_id: updated.id,
                    });
                } catch (cErr) {
                    console.warn('[PatternModule] Error updating creation status to fitting:', cErr);
                }
            }
            setStatusMessage({
                text: 'Patrón en prueba de vestuario ("pending_fitting"). Puede registrar ajustes de confección.',
                type: 'info',
            });
        } else {
            setStatusMessage({
                text: res.error || 'No se pudo actualizar el estado a prueba de vestuario.',
                type: 'error',
            });
        }
    };

    const handleRequestApproval = () => {
        if (!geometryResult || !currentExecution) {
            setStatusMessage({
                text: 'Aprobación técnica denegada: Debe generar el patrón en la Mesa CAD antes de poder aprobarlo.',
                type: 'error',
            });
            return;
        }

        const approvalGate = evaluateApprovalTransition({
            role,
            currentExecution,
            creation: selectedCreation,
            executions: executionHistory,
            isCreationFlow: activeWorkflow === 'creation_pattern',
            patternStatus,
            hasBlockedCriteria: validationChecklist.hasBlocked,
        });
        if (!approvalGate.allowed) {
            setStatusMessage({
                text: approvalGate.message || 'No se puede aprobar el patrón.',
                type: 'error',
            });
            return;
        }

        if (role === 'client') {
            setStatusMessage({
                text: 'Acción no autorizada: El perfil clienta no dispone de permisos para aprobar patrones.',
                type: 'error',
            });
            return;
        }
        if (patternStatus !== 'pending_fitting') {
            setStatusMessage({
                text: 'Envíe el patrón a prueba primero (FITTING) antes de aprobar formalmente.',
                type: 'error',
            });
            return;
        }
        if (validationChecklist.hasBlocked) {
            const blockedItems = validationChecklist.items
                .filter((i) => i.status === 'BLOCKED')
                .map((i) => i.label)
                .join(', ');
            setStatusMessage({
                text: `Aprobación técnica denegada: Existen criterios críticos en estado BLOCKED (${blockedItems}).`,
                type: 'error',
            });
            return;
        }
        if (!validationResult || validationResult.valid !== true || (validationResult.errors && validationResult.errors.length > 0)) {
            setStatusMessage({
                text: 'Aprobación técnica denegada: Un patrón solo puede aprobarse para corte si su validación geométrica es auténticamente válida y carece de errores.',
                type: 'error',
            });
            return;
        }
        if (validationResult.missingRequiredMeasurements && validationResult.missingRequiredMeasurements.length > 0) {
            setStatusMessage({
                text: `Aprobación técnica denegada: Faltan ${validationResult.missingRequiredMeasurements.length} medida(s) obligatoria(s).`,
                type: 'error',
            });
            return;
        }
        setIsApprovalConfirmOpen(true);
    };

    const handleApprovePattern = () => {
        handleRequestApproval();
    };

    const handleApprovePatternConfirm = async () => {
        if (approvingRef.current) return;
        approvingRef.current = true;

        try {
            const approvalGate = evaluateApprovalTransition({
                role,
                currentExecution,
                creation: selectedCreation,
                executions: executionHistory,
                isCreationFlow: activeWorkflow === 'creation_pattern',
                patternStatus,
                hasBlockedCriteria: validationChecklist.hasBlocked,
            });
            if (!approvalGate.allowed && currentExecution) {
                setStatusMessage({
                    text: approvalGate.message || 'No se puede aprobar el patrón.',
                    type: 'error',
                });
                setIsApprovalConfirmOpen(false);
                return;
            }

            if (!geometryResult || !validationResult || validationResult.valid !== true || (validationResult.errors && validationResult.errors.length > 0)) {
                setStatusMessage({
                    text: 'Aprobación técnica denegada: Un patrón solo puede aprobarse para corte si su validación geométrica es válida y carece de errores.',
                    type: 'error',
                });
                setIsApprovalConfirmOpen(false);
                return;
            }

            if (!currentExecution || !geometryResult) {
                setIsApprovalConfirmOpen(false);
                setStatusMessage({
                    text: 'Aprobación cancelada: No existe un patrón generado para aprobar.',
                    type: 'error',
                });
                return;
            }

            if (activeWorkflow === 'free_pattern') {
                const updatedExec: PatternExecution = {
                    ...currentExecution,
                    status: 'approved_by_designer',
                    updated_at: new Date().toISOString(),
                };
                if (!currentExecution.id.startsWith('local_')) {
                    await updatePatternStatus(
                        currentExecution.id,
                        'approved_by_designer',
                        'Patrón libre validado y formalmente aprobado para Banco Global por Katherine Carroll.'
                    );
                }
                setPatternStatus('approved_by_designer');
                setCurrentExecution(updatedExec);
                setExecutionHistory((prev) =>
                    prev.map((e) => (e.id === updatedExec.id ? updatedExec : e))
                );
                setIsApprovalConfirmOpen(false);
                setStatusMessage({
                    text: '✓ PATRÓN LIBRE APROBADO: Patrón validado y formalmente archivado en el Banco Global de Patrones.',
                    type: 'success',
                });
                return;
            }

            const res = await approvePatternExecution({
                execution: currentExecution,
                notes: 'Patrón validado y aprobado formalmente para corte por Katherine Carroll tras prueba de vestuario.',
            });

            setIsApprovalConfirmOpen(false);

            if (res.success && res.updatedExecution) {
                setPatternStatus('approved_by_designer');
                setCurrentExecution(res.updatedExecution);
                setExecutionHistory((prev) =>
                    prev.map((e) => (e.id === res.updatedExecution!.id ? res.updatedExecution! : e))
                );

                if (activeWorkflow === 'creation_pattern' && selectedCreation) {
                    setSelectedCreation((prev) =>
                        prev ? { ...prev, status: 'approved', active_pattern_execution_id: res.updatedExecution!.id } : null
                    );
                    setClientCreations((prev) =>
                        prev.map((c) =>
                            c.id === selectedCreation.id
                                ? { ...c, status: 'approved', active_pattern_execution_id: res.updatedExecution!.id }
                                : c
                        )
                    );
                    try {
                        await updateCreation(selectedCreation.id, {
                            status: 'approved',
                            active_pattern_execution_id: res.updatedExecution.id,
                        });
                    } catch (cErr) {
                        console.warn('[PatternModule] Error updating creation status to approved:', cErr);
                    }
                }

                setStatusMessage({
                    text: `✓ PATRÓN APROBADO: Versión ${res.updatedExecution.version_label} bloqueada como versión histórica inmutable. Listo para producción.`,
                    type: 'success',
                });
            } else {
                setStatusMessage({
                    text: res.error || 'No se pudo registrar la aprobación en el servidor.',
                    type: 'error',
                });
            }
        } finally {
            approvingRef.current = false;
        }
    };

    const handleExportSvg = () => {
        if (!geometryResult) return;
        const clientSuffix = activeWorkflow === 'free_pattern'
            ? `BancoGlobal_${selectedReferenceProfileCode}`
            : (selectedClient?.full_name?.replace(/\s+/g, '_') || 'SinClienta');
        const titleSuffix = activeWorkflow === 'free_pattern'
            ? `Patrón Libre (Banco Global - ${freePatternProfileLabel})`
            : (selectedClient?.full_name || 'Atelier');
        const svgContent = exportPatternToSvg(geometryResult, {
            title: `Patrón ${GARMENT_PACKAGES[garmentType].name} — ${titleSuffix}`,
        });

        if (Platform.OS === 'web') {
            const blob = new Blob([svgContent], { type: 'image/svg+xml' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Patron_${garmentType}_${clientSuffix}_1a1.svg`;
            a.click();
            URL.revokeObjectURL(url);
            setStatusMessage({ text: 'Archivo SVG a escala física 1:1 descargado.', type: 'info' });
        } else {
            Alert.alert('SVG Generado', 'La exportación física a escala 1:1 está lista.');
        }
    };

    const handlePrintTiled = () => {
        if (!geometryResult) return;
        const clientDisplayName = activeWorkflow === 'free_pattern'
            ? `Patrón Libre / Banco Global (${freePatternProfileLabel})`
            : (selectedClient?.full_name || 'Clienta');
        const html = generateTiledPrintHtml(geometryResult, {
            title: `Patrón ${GARMENT_PACKAGES[garmentType].name}`,
            clientName: clientDisplayName,
            paperSize: 'a4',
        });

        if (Platform.OS === 'web') {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write(html);
                printWindow.document.close();
            }
        } else {
            Alert.alert('Mosaico 1:1', 'Ventana de impresión en mosaico generada.');
        }
    };

    const handleExportDxf = () => {
        if (!geometryResult) {
            setStatusMessage({
                text: 'No hay ningún patrón generado para exportar. Por favor genere el patrón primero.',
                type: 'error',
            });
            return;
        }

        const geomValidation = validateGeometryForCadExport(geometryResult);
        if (!geomValidation.valid) {
            setStatusMessage({
                text: `Exportación CAD/DXF bloqueada por fallo geométrico: ${geomValidation.errors.join('; ')}.`,
                type: 'error',
            });
            return;
        }

        try {
            const dxfContent = exportPatternToDxf(
                geometryResult,
                `Atelier Digital - ${GARMENT_PACKAGES[garmentType].name}`
            );

            const tplName = selectedTemplate ? selectedTemplate.name.replace(/\s+/g, '_') : 'Base';
            const versionStr = selectedTemplate ? `v${selectedTemplate.version}` : 'v1.0';
            const fileName = `Patron_${garmentType}_${tplName}_${versionStr}_R12.dxf`;
            const formattedDate = new Date().toLocaleString();

            setLastExportInfo({
                fileName,
                garmentName: GARMENT_PACKAGES[garmentType].name,
                templateName: selectedTemplate?.name || 'Plantilla Base',
                version: versionStr,
                date: formattedDate,
                units: 'Milímetros (mm) — Escala 1:1',
                piecesCount: geometryResult.pieces.length,
            });

            if (Platform.OS === 'web') {
                const blob = new Blob([dxfContent], { type: 'application/dxf' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                a.click();
                URL.revokeObjectURL(url);
                setStatusMessage({
                    text: `Patrón exportado correctamente en formato CAD DXF (AutoCAD R12). Archivo: ${fileName} (${geometryResult.pieces.length} piezas, unidades en mm).`,
                    type: 'success',
                });
            } else {
                Alert.alert(
                    'Patrón exportado correctamente',
                    `Archivo: ${fileName}\nPrenda: ${GARMENT_PACKAGES[garmentType].name}\nPlantilla: ${selectedTemplate?.name || 'Base'}\nVersión: ${versionStr}\nFecha: ${formattedDate}\nUnidades: Milímetros (mm)\nPiezas: ${geometryResult.pieces.length}`
                );
            }
        } catch (err: any) {
            setStatusMessage({
                text: `Error al generar archivo DXF: ${err?.message || err}`,
                type: 'error',
            });
        }
    };

    const renderBankClosureSection = () => {
        if (activeWorkflow !== 'free_pattern') return null;
        return (
            <View style={styles.bankClosureContainer}>
                <View style={styles.bankClosureHeader}>
                    <View style={styles.bankClosureBadge}>
                        <Text style={styles.bankClosureBadgeText}>CIERRE TÉCNICO · BANCO GLOBAL</Text>
                    </View>
                    <Text style={styles.bankClosureTitle}>
                        Guardar en el Banco del Atelier
                    </Text>
                    <Text style={styles.bankClosureSubtitle}>
                        Este patrón libre puede ser archivado de forma inmutable en el Banco Global de Alta Costura para prototipado, catálogo de moldería arquetípica o futura vinculación a clientas y creaciones.
                    </Text>
                </View>

                <View style={styles.bankClosureActionsRow}>
                    <TouchableOpacity
                        style={styles.bankClosureSaveBtn}
                        onPress={() => {
                            if (!currentExecution) {
                                handleGeneratePattern();
                            } else {
                                setStatusMessage({
                                    text: `✓ Patrón libre ${currentExecution.version_label} guardado y confirmado en el Banco Global del Atelier.`,
                                    type: 'success',
                                });
                            }
                        }}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.bankClosureSaveBtnText}>
                            GUARDAR PATRÓN →
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.bankClosureExperimentBtn}
                        onPress={() => {
                            setActiveStudioTab('garment');
                            setStatusMessage({
                                text: 'Modo experimentación: puede seleccionar otras tallas, siluetas o editar cotas.',
                                type: 'info',
                            });
                        }}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.bankClosureExperimentBtnText}>
                            CONTINUAR EXPERIMENTANDO →
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.bankClosureBankBtn}
                        onPress={() => router.push('/(designer)/pattern-bank')}
                        activeOpacity={0.85}
                    >
                        <Text style={styles.bankClosureBankBtnText}>
                            VER BANCO GLOBAL →
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return {
        commitActiveExecution,
        handleGeneratePattern,
        handleSendToFitting,
        handleRequestApproval,
        handleApprovePattern,
        handleApprovePatternConfirm,
        handleExportSvg,
        handlePrintTiled,
        handleExportDxf,
        renderBankClosureSection,
    };
}
