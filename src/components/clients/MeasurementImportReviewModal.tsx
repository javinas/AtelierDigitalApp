// ==============================================================================
// ATELIER DIGITAL — COMPONENTE: IMPORTADOR & PANTALLA DE REVISIÓN HUMANA (FASE 3)
// Archivo: src/components/clients/MeasurementImportReviewModal.tsx
// ==============================================================================
// Permite importar medidas desde Excel (.xlsx/.csv), PDF o Fotografías de fichas físicas.
// Cumple con la regla de oro: NUNCA insertar sin revisión y confirmación expresa humana.
// Detecta anomalías: medidas faltantes, valores sospechosos y duplicados.
// ==============================================================================

import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { colors } from '../../theme/colors';
import { typography } from '../../theme/typography';
import { Client } from '../../types/client';
import { DemographicCategory, MeasuredPerson, MeasurementGroup } from '../../types/personGroup';
import { createPerson } from '../../services/personGroupService';
import { downloadOfficialExcelTemplate } from '../../helpers/exportMeasurementDataHelper';
import {
    parseExcelOrCsvFile,
    parsePdfFile,
    parsePhotoOcr,
} from '../../services/measurementImportParserService';

interface MeasurementImportReviewModalProps {
    visible: boolean;
    client: Client;
    existingPersons: MeasuredPerson[];
    existingGroups: MeasurementGroup[];
    onSuccess: () => void;
    onClose: () => void;
}

export interface RecognizedImportRow {
    tempId: string;
    fullName: string;
    referenceId: string;
    demographicCategory: DemographicCategory;
    groupName: string;
    estatura: string;
    contornoCuello: string;
    contornoBusto: string;
    contornoCintura: string;
    contornoCadera: string;
    anchoHombros: string;
    largoTalle: string;
    largoBrazo: string;
    tiro: string;
    warnings: string[];
    isDuplicate: boolean;
}

// Datos sintéticos iniciales de demostración reconocidos por OCR / Parser
const SAMPLE_RECOGNIZED_DATA: RecognizedImportRow[] = [
    {
        tempId: 'row-1',
        fullName: 'Valentina Sofía Navarro Morales',
        referenceId: 'ALUM-M31',
        demographicCategory: 'girl',
        groupName: 'CURSO DEMOSTRACIÓN 30 ALUMNOS',
        estatura: '158.0',
        contornoCuello: '34.0',
        contornoBusto: '78.0',
        contornoCintura: '64.0',
        contornoCadera: '82.0',
        anchoHombros: '37.0',
        largoTalle: '39.0',
        largoBrazo: '54.0',
        tiro: '24.0',
        warnings: [],
        isDuplicate: false,
    },
    {
        tempId: 'row-2',
        fullName: 'Mateo Alejandro Rodríguez Gómez', // Duplicado intencional de prueba
        referenceId: 'ALUM-M01',
        demographicCategory: 'boy',
        groupName: 'CURSO DEMOSTRACIÓN 30 ALUMNOS',
        estatura: '164.0',
        contornoCuello: '35.0',
        contornoBusto: '82.0',
        contornoCintura: '70.0',
        contornoCadera: '84.0',
        anchoHombros: '39.0',
        largoTalle: '41.0',
        largoBrazo: '58.0',
        tiro: '25.0',
        warnings: ['Posible duplicado (ya existe en el cliente)'],
        isDuplicate: true,
    },
    {
        tempId: 'row-3',
        fullName: 'Camila Andrea Jiménez Ospina',
        referenceId: 'ALUM-M32',
        demographicCategory: 'girl',
        groupName: 'CURSO DEMOSTRACIÓN 30 ALUMNOS',
        estatura: '162.0',
        contornoCuello: '', // Medida faltante
        contornoBusto: '84.0',
        contornoCintura: '19.0', // Valor sospechoso (cintura muy baja)
        contornoCadera: '86.0',
        anchoHombros: '38.0',
        largoTalle: '40.0',
        largoBrazo: '56.0',
        tiro: '24.5',
        warnings: ['Falta contorno de cuello', 'Valor sospechoso en contorno de cintura (< 30 cm)'],
        isDuplicate: false,
    },
    {
        tempId: 'row-4',
        fullName: 'Lucas Emmanuel Pinedo Silva',
        referenceId: 'ALUM-M33',
        demographicCategory: 'boy',
        groupName: 'CURSO DEMOSTRACIÓN 30 ALUMNOS',
        estatura: '170.0',
        contornoCuello: '36.5',
        contornoBusto: '88.0',
        contornoCintura: '72.0',
        contornoCadera: '90.0',
        anchoHombros: '41.0',
        largoTalle: '43.0',
        largoBrazo: '61.0',
        tiro: '26.0',
        warnings: [],
        isDuplicate: false,
    },
];

export function MeasurementImportReviewModal({
    visible,
    client,
    existingPersons,
    existingGroups,
    onSuccess,
    onClose,
}: MeasurementImportReviewModalProps) {
    const [step, setStep] = useState<'select' | 'processing' | 'review'>('select');
    const [selectedFileType, setSelectedFileType] = useState<'excel' | 'pdf' | 'photo'>('excel');
    const [fileName, setFileName] = useState<string>('');
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [uploadedFileCount, setUploadedFileCount] = useState<number>(0);
    const [processingMessage, setProcessingMessage] = useState<string>('Reconociendo estructura y cotas anatómicas...');
    const [rows, setRows] = useState<RecognizedImportRow[]>([]);
    const [humanReviewed, setHumanReviewed] = useState<boolean>(false);
    const [saving, setSaving] = useState<boolean>(false);

    if (!visible) return null;

    const handleSelectLocalFile = (accept: string, multiple = false) => {
        if (typeof document === 'undefined') return;
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.multiple = multiple;
        input.onchange = (e: any) => {
            const rawFiles = e.target.files;
            if (rawFiles && rawFiles.length > 0) {
                const filesArray = Array.from(rawFiles) as File[];
                setSelectedFiles(filesArray);
                setFileName(filesArray[0].name);
                setUploadedFileCount(filesArray.length);
            }
        };
        input.click();
    };

    const handleStartRecognition = async (type: 'excel' | 'pdf' | 'photo') => {
        setSelectedFileType(type);

        if (selectedFiles.length === 0) {
            Alert.alert(
                'Archivo Requerido',
                `Por favor seleccione primero un archivo real de ${
                    type === 'excel' ? 'Excel/CSV' : type === 'pdf' ? 'Documento PDF' : 'Fotografías'
                } antes de iniciar el procesamiento.`
            );
            return;
        }

        setStep('processing');
        setProcessingMessage(
            type === 'excel'
                ? 'Analizando libro de cálculo, normalizando columnas anatómicas...'
                : type === 'pdf'
                ? 'Extrayendo texto y cotas estructuradas de fichas PDF...'
                : 'Procesando imágenes con motor OCR Tesseract...'
        );

        try {
            let recognized: RecognizedImportRow[] = [];

            if (type === 'excel') {
                recognized = await parseExcelOrCsvFile(selectedFiles[0], existingPersons);
            } else if (type === 'pdf') {
                recognized = await parsePdfFile(selectedFiles[0], existingPersons);
            } else if (type === 'photo') {
                recognized = await parsePhotoOcr(selectedFiles, existingPersons, (msg) => {
                    setProcessingMessage(msg);
                });
            }

            setRows(recognized);
            setStep('review');
        } catch (err: any) {
            Alert.alert(
                'Error de Procesamiento',
                err?.message || 'No se pudieron extraer datos válidos del archivo seleccionado.'
            );
            setStep('select');
        }
    };

    const handleRowChange = (tempId: string, field: keyof RecognizedImportRow, value: any) => {
        setRows((prev) =>
            prev.map((r) => {
                if (r.tempId !== tempId) return r;
                const updated = { ...r, [field]: value };

                // Reevaluar advertencias dinámicas
                const newWarnings: string[] = [];
                if (updated.isDuplicate) {
                    newWarnings.push('Posible duplicado en el sistema');
                }
                if (!updated.contornoCuello || parseFloat(updated.contornoCuello) <= 0) {
                    newWarnings.push('Falta contorno de cuello');
                }
                if (!updated.contornoBusto || parseFloat(updated.contornoBusto) <= 0) {
                    newWarnings.push('Falta contorno de busto');
                }
                const cinturaNum = parseFloat(updated.contornoCintura);
                if (!updated.contornoCintura || isNaN(cinturaNum) || cinturaNum < 30 || cinturaNum > 180) {
                    newWarnings.push('Valor atípico o sospechoso en cintura (rango 30-180 cm)');
                }
                updated.warnings = newWarnings;
                return updated;
            })
        );
    };

    const handleRemoveRow = (tempId: string) => {
        setRows((prev) => prev.filter((r) => r.tempId !== tempId));
    };

    const handleConfirmAndSave = async () => {
        if (!humanReviewed) {
            Alert.alert(
                'Revisión Humana Obligatoria',
                'Por protocolo de Alta Costura, debe marcar la casilla confirmando que ha validado y corregido los datos antes de guardarlos en el Atelier.'
            );
            return;
        }

        const validRows = rows.filter((r) => !r.isDuplicate);
        if (validRows.length === 0) {
            Alert.alert('Sin registros válidos', 'Todos los registros son duplicados o han sido removidos.');
            return;
        }

        setSaving(true);
        try {
            // Guardar personas en la base de datos
            for (const r of validRows) {
                await createPerson({
                    client_id: client.id,
                    full_name: r.fullName,
                    demographic_category: r.demographicCategory,
                    reference_id: r.referenceId,
                    notes: `Importado vía ${selectedFileType.toUpperCase()} · Validador Atelier`,
                });
            }

            Alert.alert(
                '✓ Importación Exitosa',
                `Se guardaron ${validRows.length} personas y sus datos de referencia en el Atelier.`
            );
            onSuccess();
            onClose();
        } catch (err: any) {
            Alert.alert('Error al guardar', err?.message || 'Error en la sincronización');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={styles.modalBackdrop}>
                <View style={styles.dialogCard}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.superTitle}>INTERCAMBIO DE DATOS · ATELIER KATHERINE CARROLL</Text>
                            <Text style={styles.title}>Importación Asistida de Personas y Medidas</Text>
                            <Text style={styles.subtitle}>
                                Cliente:{' '}
                                <Text style={styles.highlight}>{client.full_name}</Text> · Reconocimiento OCR y Tabular con Validación Humana Obligatoria
                            </Text>
                        </View>
                        <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                            <Text style={styles.closeBtnText}>✕ Cerrar</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Paso 1: Selección de Archivo */}
                    {step === 'select' && (
                        <ScrollView contentContainerStyle={styles.bodyContent}>
                            <Text style={styles.stepTitle}>PASO 1: SELECCIONE EL FORMATO DE ORIGEN</Text>
                            <Text style={styles.stepDesc}>
                                El motor de Atelier Digital analiza la estructura externa, mapea las cotas anatómicas y prepara una pantalla de revisión antes de insertar cualquier dato en Supabase.
                            </Text>

                            <View style={styles.sourceGrid}>
                                <TouchableOpacity
                                    style={[styles.sourceCard, selectedFileType === 'excel' && styles.sourceCardActive]}
                                    onPress={() => setSelectedFileType('excel')}
                                >
                                    <Text style={styles.sourceIcon}>📊</Text>
                                    <Text style={styles.sourceTitle}>Planilla Excel / XLSX</Text>
                                    <Text style={styles.sourceSub}>
                                        Formatos oficiales del Atelier o tablas externas de colegios, empresas y dotaciones.
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.sourceCard, selectedFileType === 'pdf' && styles.sourceCardActive]}
                                    onPress={() => setSelectedFileType('pdf')}
                                >
                                    <Text style={styles.sourceIcon}>📄</Text>
                                    <Text style={styles.sourceTitle}>Documento PDF / Fichas A4</Text>
                                    <Text style={styles.sourceSub}>
                                        Extracción óptica de fichas físicas impresas o listados digitales escaneados.
                                    </Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.sourceCard, selectedFileType === 'photo' && styles.sourceCardActive]}
                                    onPress={() => setSelectedFileType('photo')}
                                >
                                    <Text style={styles.sourceIcon}>📷</Text>
                                    <Text style={styles.sourceTitle}>Fotografía de Ficha Física</Text>
                                    <Text style={styles.sourceSub}>
                                        Foto tomada con celular o cámara de fichas manuscritas tomadas en taller o campo.
                                    </Text>
                                </TouchableOpacity>
                            </View>

                            {/* Opciones Específicas por Tipo de Formato */}
                            {selectedFileType === 'excel' && (
                                <View style={styles.optionActionBox}>
                                    <View style={styles.templateDownloadHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.optionBoxTitle}>¿AÚN NO TIENE LA PLANTILLA OFICIAL?</Text>
                                            <Text style={styles.optionBoxSub}>
                                                Descargue el libro Excel oficial de Alta Costura pre-formateado con las columnas anatómicas, rangos válidos e instrucciones para compartir con el cliente o colegio.
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.downloadTemplateBtn}
                                            onPress={downloadOfficialExcelTemplate}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.downloadTemplateBtnText}>
                                                📥 Descargar Plantilla Oficial Excel (.xls)
                                            </Text>
                                        </TouchableOpacity>
                                    </View>

                                    <View style={styles.uploadTriggerRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.filePickerLabel}>CARGAR ARCHIVO DILIGENCIADO:</Text>
                                            <Text style={styles.fileNameText}>
                                                {fileName ? `📁 ${fileName}` : 'Ningún archivo cargado todavía'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.browseFileBtn}
                                            onPress={() => handleSelectLocalFile('.xlsx,.xls,.csv')}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.browseFileBtnText}>📂 Explorar y Cargar Excel / CSV</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {selectedFileType === 'pdf' && (
                                <View style={styles.optionActionBox}>
                                    <View style={{ flex: 1, marginBottom: 12 }}>
                                        <Text style={styles.optionBoxTitle}>CARGAR DOCUMENTO PDF CON FICHAS A4</Text>
                                        <Text style={styles.optionBoxSub}>
                                            El motor OCR procesa cada página del documento, lee los encabezados de la persona y extrae la tabla de medidas anatómicas completada.
                                        </Text>
                                    </View>
                                    <View style={styles.uploadTriggerRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.filePickerLabel}>DOCUMENTO PDF SELECCIONADO:</Text>
                                            <Text style={styles.fileNameText}>
                                                {fileName ? `📄 ${fileName}` : 'Ningún PDF seleccionado todavía'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.browseFileBtn}
                                            onPress={() => handleSelectLocalFile('.pdf')}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.browseFileBtnText}>📂 Seleccionar Documento PDF</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {selectedFileType === 'photo' && (
                                <View style={styles.optionActionBox}>
                                    <View style={{ flex: 1, marginBottom: 12 }}>
                                        <Text style={styles.optionBoxTitle}>CARGAR FOTOGRAFÍAS DE FICHAS FÍSICAS (MÚLTIPLES ARCHIVOS)</Text>
                                        <Text style={styles.optionBoxSub}>
                                            Puede seleccionar múltiples fotos a la vez. Recomendación: toma cenital perpendicular, buena iluminación y sin sombras sobre los números manuscritos.
                                        </Text>
                                    </View>
                                    <View style={styles.uploadTriggerRow}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.filePickerLabel}>FOTOGRAFÍAS DETECTADAS:</Text>
                                            <Text style={styles.fileNameText}>
                                                {uploadedFileCount > 0
                                                    ? `📷 ${uploadedFileCount} foto(s) seleccionada(s) (${fileName})`
                                                    : 'Ninguna fotografía seleccionada todavía'}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.browseFileBtn}
                                            onPress={() => handleSelectLocalFile('image/*', true)}
                                            activeOpacity={0.85}
                                        >
                                            <Text style={styles.browseFileBtnText}>📷 Seleccionar Fotos (JPG / PNG)</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            )}

                            {/* Explicación de cómo funciona el Reconocimiento */}
                            <View style={styles.recognitionExplainCard}>
                                <Text style={styles.recognitionExplainTitle}>
                                    ⚡ ¿CÓMO FUNCIONA EL PROCESAMIENTO Y RECONOCIMIENTO DE COLUMNAS?
                                </Text>
                                <View style={styles.stepsList}>
                                    <Text style={styles.stepItem}>
                                        <Text style={{ fontWeight: '700', color: colors.champagneGold }}>1. Normalización Anatómica:</Text> Identifica automáticamente las columnas sin importar variaciones en el nombre (ej. «Estatura», «Talla», «Busto», «Pecho», «Cintura», «Waist», etc.).
                                    </Text>
                                    <Text style={styles.stepItem}>
                                        <Text style={{ fontWeight: '700', color: colors.champagneGold }}>2. Detección de Sujetos y Grupos:</Text> Extrae nombres completos, códigos/matrículas y núcleos asociados a este cliente.
                                    </Text>
                                    <Text style={styles.stepItem}>
                                        <Text style={{ fontWeight: '700', color: colors.champagneGold }}>3. Auditoría Biométrica:</Text> Cruza cada medida contra los límites anatómicos del Atelier (alerta sobre medidas faltantes y valores atípicos como cinturas menores a 30 cm).
                                    </Text>
                                    <Text style={styles.stepItem}>
                                        <Text style={{ fontWeight: '700', color: colors.champagneGold }}>4. Control de Duplicados:</Text> Compara contra las personas ya registradas para prevenir dobles registros.
                                    </Text>
                                    <Text style={styles.stepItem}>
                                        <Text style={{ fontWeight: '700', color: colors.champagneGold }}>5. Pantalla Obligatoria de Revisión:</Text> <Text style={{ fontWeight: '700' }}>Regla de Oro:</Text> Nunca guarda directamente. Le presenta una tabla editable para su verificación y aprobación expresa.
                                    </Text>
                                </View>

                                <TouchableOpacity
                                    style={styles.simulateBtn}
                                    onPress={() => handleStartRecognition(selectedFileType)}
                                    activeOpacity={0.85}
                                >
                                    <Text style={styles.simulateBtnText}>
                                        ⚡ Iniciar Procesamiento y Reconocer Columnas →
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </ScrollView>
                    )}

                    {/* Paso 2: Procesamiento / Reconocimiento */}
                    {step === 'processing' && (
                        <View style={styles.processingContainer}>
                            <ActivityIndicator size="large" color={colors.champagneGold} />
                            <Text style={styles.processingTitle}>{processingMessage}</Text>
                            <Text style={styles.processingSub}>
                                Mapeando columnas anatómicas, identificando sujetos, detectando posibles duplicados y valores atípicos.
                            </Text>
                        </View>
                    )}

                    {/* Paso 3: Pantalla de Revisión Humana Obligatoria */}
                    {step === 'review' && (
                        <View style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                            <View style={styles.reviewBanner}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.reviewBannerTitle}>
                                        ⚠️ PANTALLA OBLIGATORIA DE REVISIÓN HUMANA (AUDITORÍA ANATÓMICA)
                                    </Text>
                                    <Text style={styles.reviewBannerDesc}>
                                        Verifique y corrija los valores detectados antes de guardar. Las celdas con advertencia están resaltadas.
                                    </Text>
                                </View>
                                <View style={styles.reviewStats}>
                                    <Text style={styles.statsText}>
                                        {rows.length} detectados ·{' '}
                                        <Text style={{ color: '#C62828', fontWeight: '700' }}>
                                            {rows.filter((r) => r.warnings.length > 0).length} con alertas
                                        </Text>
                                    </Text>
                                </View>
                            </View>

                            {/* Tabla Interactiva de Revisión y Corrección */}
                            <ScrollView style={styles.tableScroll}>
                                <View style={styles.tableCard}>
                                    {/* Cabecera */}
                                    <View style={styles.tHeadRow}>
                                        <Text style={[styles.thCell, { width: 180 }]}>PERSONA / REF</Text>
                                        <Text style={[styles.thCell, { width: 90 }]}>CATEGORÍA</Text>
                                        <Text style={[styles.thCell, { width: 65, textAlign: 'center' }]}>ESTAT.</Text>
                                        <Text style={[styles.thCell, { width: 65, textAlign: 'center' }]}>CUELLO</Text>
                                        <Text style={[styles.thCell, { width: 65, textAlign: 'center' }]}>BUSTO</Text>
                                        <Text style={[styles.thCell, { width: 65, textAlign: 'center' }]}>CINTURA</Text>
                                        <Text style={[styles.thCell, { width: 65, textAlign: 'center' }]}>CADERA</Text>
                                        <Text style={[styles.thCell, { width: 65, textAlign: 'center' }]}>HOMBROS</Text>
                                        <Text style={[styles.thCell, { flex: 1 }]}>ESTADO & ADVERTENCIAS</Text>
                                        <Text style={[styles.thCell, { width: 45, textAlign: 'center' }]}>ACC.</Text>
                                    </View>

                                    {/* Filas */}
                                    {rows.map((row) => {
                                        const hasWarn = row.warnings.length > 0;
                                        return (
                                            <View
                                                key={row.tempId}
                                                style={[
                                                    styles.tRow,
                                                    hasWarn && styles.tRowWarning,
                                                    row.isDuplicate && styles.tRowDuplicate,
                                                ]}
                                            >
                                                {/* Nombre y Ref */}
                                                <View style={{ width: 180, paddingRight: 6 }}>
                                                    <TextInput
                                                        style={styles.cellInputBold}
                                                        value={row.fullName}
                                                        onChangeText={(t) => handleRowChange(row.tempId, 'fullName', t)}
                                                    />
                                                    <TextInput
                                                        style={styles.cellInputSmall}
                                                        value={row.referenceId}
                                                        onChangeText={(t) => handleRowChange(row.tempId, 'referenceId', t)}
                                                        placeholder="Ref. / Matrícula"
                                                    />
                                                </View>

                                                {/* Categoría */}
                                                <View style={{ width: 90, paddingRight: 6 }}>
                                                    <Text style={styles.demoBadgeText}>
                                                        {row.demographicCategory.toUpperCase()}
                                                    </Text>
                                                </View>

                                                {/* Estatura */}
                                                <View style={{ width: 65, paddingHorizontal: 2 }}>
                                                    <TextInput
                                                        style={styles.cellInputNumber}
                                                        value={row.estatura}
                                                        onChangeText={(t) => handleRowChange(row.tempId, 'estatura', t)}
                                                    />
                                                </View>

                                                {/* Cuello */}
                                                <View style={{ width: 65, paddingHorizontal: 2 }}>
                                                    <TextInput
                                                        style={[
                                                            styles.cellInputNumber,
                                                            !row.contornoCuello && styles.cellInputAlert,
                                                        ]}
                                                        value={row.contornoCuello}
                                                        placeholder="0.0"
                                                        placeholderTextColor="#C62828"
                                                        onChangeText={(t) => handleRowChange(row.tempId, 'contornoCuello', t)}
                                                    />
                                                </View>

                                                {/* Busto */}
                                                <View style={{ width: 65, paddingHorizontal: 2 }}>
                                                    <TextInput
                                                        style={styles.cellInputNumber}
                                                        value={row.contornoBusto}
                                                        onChangeText={(t) => handleRowChange(row.tempId, 'contornoBusto', t)}
                                                    />
                                                </View>

                                                {/* Cintura */}
                                                <View style={{ width: 65, paddingHorizontal: 2 }}>
                                                    <TextInput
                                                        style={[
                                                            styles.cellInputNumber,
                                                            parseFloat(row.contornoCintura) < 30 && styles.cellInputAlert,
                                                        ]}
                                                        value={row.contornoCintura}
                                                        onChangeText={(t) => handleRowChange(row.tempId, 'contornoCintura', t)}
                                                    />
                                                </View>

                                                {/* Cadera */}
                                                <View style={{ width: 65, paddingHorizontal: 2 }}>
                                                    <TextInput
                                                        style={styles.cellInputNumber}
                                                        value={row.contornoCadera}
                                                        onChangeText={(t) => handleRowChange(row.tempId, 'contornoCadera', t)}
                                                    />
                                                </View>

                                                {/* Hombros */}
                                                <View style={{ width: 65, paddingHorizontal: 2 }}>
                                                    <TextInput
                                                        style={styles.cellInputNumber}
                                                        value={row.anchoHombros}
                                                        onChangeText={(t) => handleRowChange(row.tempId, 'anchoHombros', t)}
                                                    />
                                                </View>

                                                {/* Advertencias */}
                                                <View style={{ flex: 1, paddingHorizontal: 4 }}>
                                                    {row.warnings.length === 0 ? (
                                                        <Text style={styles.okBadge}>✓ Medidas coherentes</Text>
                                                    ) : (
                                                        row.warnings.map((w, idx) => (
                                                            <Text key={idx} style={styles.warningText}>
                                                                ⚠️ {w}
                                                            </Text>
                                                        ))
                                                    )}
                                                </View>

                                                {/* Acciones */}
                                                <View style={{ width: 45, alignItems: 'center' }}>
                                                    <TouchableOpacity
                                                        style={styles.deleteRowBtn}
                                                        onPress={() => handleRemoveRow(row.tempId)}
                                                    >
                                                        <Text style={styles.deleteRowText}>✕</Text>
                                                    </TouchableOpacity>
                                                </View>
                                            </View>
                                        );
                                    })}
                                </View>
                            </ScrollView>

                            {/* Checkbox de Confirmación Expresa Humana */}
                            <View style={styles.confirmationBar}>
                                <TouchableOpacity
                                    style={styles.checkboxRow}
                                    onPress={() => setHumanReviewed(!humanReviewed)}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[styles.checkIcon, humanReviewed && styles.checkIconActive]}>
                                        {humanReviewed ? '☑' : '☐'}
                                    </Text>
                                    <Text style={styles.checkLabel}>
                                        <Text style={{ fontWeight: '700' }}>Confirmación expresa requerida:</Text> He revisado, corregido y validado manualmente los datos anatómicos reconocidos. Autorizo guardarlos en Supabase.
                                    </Text>
                                </TouchableOpacity>

                                <View style={styles.actionButtonsRow}>
                                    <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                                        <Text style={styles.cancelBtnText}>Cancelar</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[styles.confirmSaveBtn, !humanReviewed && styles.confirmSaveBtnDisabled]}
                                        disabled={!humanReviewed || saving}
                                        onPress={handleConfirmAndSave}
                                    >
                                        {saving ? (
                                            <ActivityIndicator size="small" color="#FFFFFF" />
                                        ) : (
                                            <Text style={styles.confirmSaveBtnText}>
                                                ✓ Confirmar y Guardar en Supabase ({rows.filter((r) => !r.isDuplicate).length} Personas)
                                            </Text>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(23, 20, 17, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    dialogCard: {
        width: 1020,
        maxWidth: '100%',
        height: '92%',
        backgroundColor: '#FFFFFF',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.sand,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },
    header: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 24,
        paddingVertical: 18,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomWidth: 1,
        borderBottomColor: '#2C2723',
    },
    superTitle: {
        fontSize: 9.5,
        fontFamily: typography.serif,
        color: colors.champagneGold,
        letterSpacing: 1.5,
        textTransform: 'uppercase',
    },
    title: {
        fontSize: 19,
        fontFamily: typography.serif,
        color: colors.ivoryWarm,
        fontWeight: '700',
        marginTop: 2,
    },
    subtitle: {
        fontSize: 11,
        color: '#B0A398',
        marginTop: 2,
    },
    highlight: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    closeBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#443D36',
    },
    closeBtnText: {
        color: colors.ivoryWarm,
        fontSize: 12,
    },
    bodyContent: {
        padding: 30,
        flex: 1,
    },
    stepTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 1,
    },
    stepDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        marginTop: 4,
        marginBottom: 20,
    },
    sourceGrid: {
        flexDirection: 'row',
        gap: 16,
        marginBottom: 24,
    },
    sourceCard: {
        flex: 1,
        backgroundColor: '#FAF6F0',
        borderRadius: 6,
        borderWidth: 1.5,
        borderColor: '#EFE7DC',
        padding: 18,
    },
    sourceCardActive: {
        borderColor: colors.champagneGold,
        backgroundColor: '#F5EFE6',
    },
    sourceIcon: {
        fontSize: 28,
        marginBottom: 8,
    },
    sourceTitle: {
        fontSize: 14,
        fontFamily: typography.serif,
        fontWeight: '700',
        color: colors.atelierBlack,
        marginBottom: 4,
    },
    sourceSub: {
        fontSize: 10.5,
        color: colors.textMuted,
        lineHeight: 15,
    },
    filePickerBox: {
        backgroundColor: '#FAF6F0',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 18,
    },
    optionActionBox: {
        backgroundColor: '#FAF6F0',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 18,
        marginBottom: 20,
    },
    templateDownloadHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#EFE7DC',
        marginBottom: 14,
        gap: 16,
    },
    optionBoxTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.atelierBlack,
        letterSpacing: 0.5,
    },
    optionBoxSub: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
        lineHeight: 15,
    },
    downloadTemplateBtn: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: colors.champagneGold,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 4,
    },
    downloadTemplateBtnText: {
        color: colors.champagneGold,
        fontSize: 11.5,
        fontWeight: '700',
    },
    uploadTriggerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
    },
    browseFileBtn: {
        backgroundColor: colors.atelierBlack,
        paddingHorizontal: 16,
        paddingVertical: 9,
        borderRadius: 4,
    },
    browseFileBtnText: {
        color: colors.ivoryWarm,
        fontSize: 12,
        fontWeight: '600',
    },
    recognitionExplainCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 6,
        borderWidth: 1,
        borderColor: colors.sand,
        padding: 20,
        marginTop: 10,
        gap: 14,
    },
    recognitionExplainTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
    },
    stepsList: {
        gap: 8,
    },
    stepItem: {
        fontSize: 11.5,
        color: colors.textSecondary,
        lineHeight: 18,
    },
    filePickerLabel: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.champagneGold,
        letterSpacing: 0.8,
        marginBottom: 8,
    },
    filePickerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    fileNameText: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.atelierBlack,
    },
    simulateBtn: {
        backgroundColor: colors.champagneGold,
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 4,
    },
    simulateBtnText: {
        color: '#FFFFFF',
        fontSize: 12.5,
        fontWeight: '700',
    },
    processingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        gap: 12,
    },
    processingTitle: {
        fontSize: 16,
        fontFamily: typography.serif,
        fontWeight: '700',
        color: colors.atelierBlack,
    },
    processingSub: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        maxWidth: 500,
    },
    reviewBanner: {
        backgroundColor: '#FFF8E1',
        borderBottomWidth: 1,
        borderBottomColor: '#FFE082',
        paddingHorizontal: 20,
        paddingVertical: 10,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    reviewBannerTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#8D6E63',
        letterSpacing: 0.5,
    },
    reviewBannerDesc: {
        fontSize: 10,
        color: '#5D4037',
        marginTop: 1,
    },
    reviewStats: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#FFE082',
    },
    statsText: {
        fontSize: 11,
        color: colors.atelierBlack,
        fontWeight: '600',
    },
    tableScroll: {
        flex: 1,
        padding: 16,
    },
    tableCard: {
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: colors.sand,
        borderRadius: 4,
        overflow: 'hidden',
    },
    tHeadRow: {
        flexDirection: 'row',
        backgroundColor: colors.atelierBlack,
        paddingVertical: 8,
        paddingHorizontal: 8,
        alignItems: 'center',
    },
    thCell: {
        color: colors.ivoryWarm,
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    tRow: {
        flexDirection: 'row',
        paddingVertical: 6,
        paddingHorizontal: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#F0E8DD',
        alignItems: 'center',
    },
    tRowWarning: {
        backgroundColor: '#FFFDE7',
    },
    tRowDuplicate: {
        backgroundColor: '#FFEBEE',
    },
    cellInputBold: {
        fontSize: 11.5,
        fontWeight: '700',
        color: colors.atelierBlack,
        padding: 2,
        borderBottomWidth: 1,
        borderBottomColor: '#D7CCC8',
    },
    cellInputSmall: {
        fontSize: 9.5,
        color: colors.textSecondary,
        padding: 1,
        marginTop: 2,
    },
    demoBadgeText: {
        fontSize: 8.5,
        fontWeight: '700',
        color: '#8C6826',
        backgroundColor: '#F3EDE2',
        paddingHorizontal: 4,
        paddingVertical: 2,
        borderRadius: 2,
        textAlign: 'center',
    },
    cellInputNumber: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.atelierBlack,
        textAlign: 'center',
        paddingVertical: 3,
        paddingHorizontal: 4,
        backgroundColor: '#FAF6F0',
        borderWidth: 1,
        borderColor: '#EFE7DC',
        borderRadius: 3,
    },
    cellInputAlert: {
        backgroundColor: '#FFCDD2',
        borderColor: '#E53935',
        color: '#B71C1C',
        fontWeight: '700',
    },
    okBadge: {
        fontSize: 9.5,
        color: '#2E7D32',
        fontWeight: '600',
    },
    warningText: {
        fontSize: 8.5,
        color: '#C62828',
        fontWeight: '600',
    },
    deleteRowBtn: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 3,
        backgroundColor: '#FFEBEE',
    },
    deleteRowText: {
        fontSize: 10,
        color: '#C62828',
        fontWeight: '700',
    },
    confirmationBar: {
        backgroundColor: '#FAF6F0',
        borderTopWidth: 1,
        borderTopColor: colors.sand,
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 10,
    },
    checkboxRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    checkIcon: {
        fontSize: 18,
        color: '#9C9388',
    },
    checkIconActive: {
        color: colors.champagneGold,
        fontWeight: '700',
    },
    checkLabel: {
        fontSize: 11,
        color: colors.atelierBlack,
        flex: 1,
    },
    actionButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 10,
    },
    cancelBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: colors.sand,
        backgroundColor: '#FFFFFF',
    },
    cancelBtnText: {
        fontSize: 12,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    confirmSaveBtn: {
        backgroundColor: colors.champagneGold,
        paddingHorizontal: 20,
        paddingVertical: 9,
        borderRadius: 4,
    },
    confirmSaveBtnDisabled: {
        backgroundColor: '#D1C7BA',
    },
    confirmSaveBtnText: {
        color: '#FFFFFF',
        fontSize: 12,
        fontWeight: '700',
    },
});
