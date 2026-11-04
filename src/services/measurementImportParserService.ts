// ==============================================================================
// ATELIER DIGITAL — SERVICIO: PARSER REAL MULTIFORMATO DE IMPORTACIÓN (FASE 3)
// Archivo: src/services/measurementImportParserService.ts
// ==============================================================================
// Procesa archivos reales de Excel (.xlsx/.xls/.csv), documentos PDF y fotos (OCR).
// Mapea encabezados anatómicos, normaliza unidades, detecta atípicos y duplicados.
// ==============================================================================

import * as XLSX from 'xlsx';
import { createWorker } from 'tesseract.js';
import { DemographicCategory, MeasuredPerson } from '../types/personGroup';
import { RecognizedImportRow } from '../components/clients/MeasurementImportReviewModal';

// Mapeo semántico de sinónimos de columnas anatómicas y datos de identidad
const HEADER_SYNONYMS: Record<string, string[]> = {
    fullName: ['nombre', 'nombre completo', 'full name', 'alumno', 'estudiante', 'persona', 'cliente', 'sujeto', 'apellidos y nombres', 'nombres'],
    referenceId: ['ref', 'referencia', 'reference', 'reference id', 'matricula', 'código', 'codigo', 'id', 'identificacion', 'documento'],
    demographicCategory: ['categoria', 'categoría', 'category', 'demographic', 'genero', 'género', 'sexo', 'perfil', 'tipo'],
    groupName: ['grupo', 'group', 'núcleo', 'nucleo', 'seccion', 'sección', 'grado', 'curso'],
    estatura: ['estatura', 'altura', 'height', 'talla (cm)', 'estatura (cm)', 'altura (cm)', 'estatura total'],
    contornoCuello: ['cuello', 'contorno cuello', 'contorno de cuello', 'neck', 'neck circumference', 'cuello (cm)'],
    contornoBusto: ['busto', 'contorno busto', 'contorno de busto', 'pecho', 'bust', 'chest', 'busto (cm)'],
    contornoCintura: ['cintura', 'contorno cintura', 'contorno de cintura', 'waist', 'cintura (cm)'],
    contornoCadera: ['cadera', 'contorno cadera', 'contorno de cadera', 'hip', 'hips', 'cadera (cm)'],
    anchoHombros: ['hombros', 'ancho hombros', 'ancho de hombros', 'shoulder', 'shoulders', 'espalda ancho'],
    largoTalle: ['talle', 'largo talle', 'largo de talle', 'talle espalda', 'talle delantero', 'back length'],
    largoBrazo: ['brazo', 'largo brazo', 'largo de brazo', 'manga', 'sleeve', 'arm length'],
    tiro: ['tiro', 'profundidad tiro', 'tiro corporal', 'crotch', 'rise'],
};

/**
 * Normaliza un string para comparación flexible de cabeceras
 */
function cleanHeader(header: string): string {
    return header
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9 ]/g, ' ')
        .trim()
        .replace(/\s+/g, ' ');
}

/**
 * Encuentra el campo canónico que mejor coincide con una cabecera
 */
function matchHeaderField(headerText: string): string | null {
    const cleaned = cleanHeader(headerText);
    for (const [field, synonyms] of Object.entries(HEADER_SYNONYMS)) {
        for (const syn of synonyms) {
            const cleanSyn = cleanHeader(syn);
            if (cleaned === cleanSyn || cleaned.includes(cleanSyn) || cleanSyn.includes(cleaned)) {
                return field;
            }
        }
    }
    return null;
}

/**
 * Determina la categoría demográfica adecuada
 */
function parseDemographic(val: any): DemographicCategory {
    if (!val) return 'woman';
    const s = String(val).toLowerCase().trim();
    if (s.includes('niñ') || s.includes('nino') || s.includes('boy')) return 'boy';
    if (s.includes('niña') || s.includes('nina') || s.includes('girl')) return 'girl';
    if (s.includes('hom') || s.includes('cab') || s.includes('man')) return 'man';
    return 'woman';
}

/**
 * Extrae un número limpio en formato string con 1 decimal
 */
function parseMeasurementValue(val: any): string {
    if (val === undefined || val === null || val === '') return '';
    const str = String(val).replace(',', '.').replace(/[^0-9.]/g, '');
    const num = parseFloat(str);
    if (isNaN(num) || num <= 0) return '';
    return num.toFixed(1);
}

/**
 * Evalúa advertencias de una fila contra límites anatómicos y duplicados
 */
export function auditRow(
    row: RecognizedImportRow,
    existingPersons: MeasuredPerson[]
): { warnings: string[]; isDuplicate: boolean } {
    const warnings: string[] = [];

    // Duplicados
    const dup = existingPersons.find(
        (p) =>
            p.full_name.toLowerCase().trim() === row.fullName.toLowerCase().trim() ||
            (p.reference_id && row.referenceId && p.reference_id.trim() === row.referenceId.trim())
    );
    if (dup) {
        warnings.push(`Posible duplicado: ya existe en el Atelier "${dup.full_name}" (${dup.reference_id || 'sin ref'})`);
    }

    // Medidas faltantes críticas
    if (!row.contornoCuello || parseFloat(row.contornoCuello) <= 0) {
        warnings.push('Falta contorno de cuello');
    }
    if (!row.contornoBusto || parseFloat(row.contornoBusto) <= 0) {
        warnings.push('Falta contorno de busto');
    }

    // Valores atípicos / biométricos sospechosos
    const cintura = parseFloat(row.contornoCintura);
    if (!row.contornoCintura || isNaN(cintura) || cintura < 30 || cintura > 180) {
        warnings.push('Valor atípico o sospechoso en cintura (esperado 30-180 cm)');
    }

    const estatura = parseFloat(row.estatura);
    if (row.estatura && (isNaN(estatura) || estatura < 70 || estatura > 240)) {
        warnings.push('Estatura fuera de rango habitual (70-240 cm)');
    }

    return {
        warnings,
        isDuplicate: Boolean(dup),
    };
}

/**
 * PARSER 1: Procesa archivos reales Excel (.xlsx, .xls) o CSV
 */
export async function parseExcelOrCsvFile(
    file: File | Blob,
    existingPersons: MeasuredPerson[]
): Promise<RecognizedImportRow[]> {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // Tomamos la primera hoja con datos
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
        throw new Error('El libro de cálculo no contiene hojas válidas.');
    }

    const worksheet = workbook.Sheets[firstSheetName];
    // Convertir a matriz 2D (filas x columnas)
    const rawData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    if (!rawData || rawData.length < 2) {
        throw new Error('El archivo no contiene suficientes filas de datos.');
    }

    // Identificar fila de encabezados (buscar la fila que contenga nombres como "Nombre", "Estatura", "Busto", etc.)
    let headerRowIdx = -1;
    let headerFieldMap: Record<number, string> = {};

    for (let r = 0; r < Math.min(10, rawData.length); r++) {
        const row = rawData[r];
        if (!Array.isArray(row)) continue;

        const candidateMap: Record<number, string> = {};
        let matches = 0;

        row.forEach((cellVal, colIdx) => {
            if (cellVal && typeof cellVal === 'string') {
                const matchedField = matchHeaderField(cellVal);
                if (matchedField) {
                    candidateMap[colIdx] = matchedField;
                    matches++;
                }
            }
        });

        // Si la fila tiene al menos 2 columnas anatómicas o de identidad, es la cabecera
        if (matches >= 2) {
            headerRowIdx = r;
            headerFieldMap = candidateMap;
            break;
        }
    }

    if (headerRowIdx === -1) {
        throw new Error('No se reconocieron encabezados válidos en la planilla. Use la Plantilla Oficial.');
    }

    // Procesar filas de datos
    const resultRows: RecognizedImportRow[] = [];

    for (let r = headerRowIdx + 1; r < rawData.length; r++) {
        const row = rawData[r];
        if (!Array.isArray(row) || row.every((c) => c === undefined || c === null || c === '')) {
            continue; // Fila vacía
        }

        const rowObj: any = {
            tempId: `row-${Date.now()}-${r}`,
            fullName: '',
            referenceId: '',
            demographicCategory: 'woman',
            groupName: '',
            estatura: '',
            contornoCuello: '',
            contornoBusto: '',
            contornoCintura: '',
            contornoCadera: '',
            anchoHombros: '',
            largoTalle: '',
            largoBrazo: '',
            tiro: '',
            warnings: [],
            isDuplicate: false,
        };

        Object.entries(headerFieldMap).forEach(([colIdxStr, fieldKey]) => {
            const colIdx = parseInt(colIdxStr, 10);
            const val = row[colIdx];
            if (val === undefined || val === null) return;

            if (fieldKey === 'fullName') {
                rowObj.fullName = String(val).trim();
            } else if (fieldKey === 'referenceId') {
                rowObj.referenceId = String(val).trim();
            } else if (fieldKey === 'demographicCategory') {
                rowObj.demographicCategory = parseDemographic(val);
            } else if (fieldKey === 'groupName') {
                rowObj.groupName = String(val).trim();
            } else {
                rowObj[fieldKey] = parseMeasurementValue(val);
            }
        });

        // Si la fila tiene al menos nombre o referencia, la incluimos
        if (rowObj.fullName || rowObj.referenceId) {
            if (!rowObj.fullName && rowObj.referenceId) {
                rowObj.fullName = `Persona ${rowObj.referenceId}`;
            }

            const audit = auditRow(rowObj, existingPersons);
            rowObj.warnings = audit.warnings;
            rowObj.isDuplicate = audit.isDuplicate;

            resultRows.push(rowObj);
        }
    }

    if (resultRows.length === 0) {
        throw new Error('No se encontraron registros de personas para importar.');
    }

    return resultRows;
}

/**
 * PARSER 2: Extracción real de documentos PDF y fichas A4
 */
export async function parsePdfFile(
    file: File | Blob,
    existingPersons: MeasuredPerson[]
): Promise<RecognizedImportRow[]> {
    const buffer = await file.arrayBuffer();

    // Importación dinámica de pdfjs-dist para entorno web/universal
    const pdfjs = await import('pdfjs-dist');
    // Configurar worker inline o estándar
    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
        pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
    }

    const loadingTask = pdfjs.getDocument({ data: new Uint8Array(buffer) });
    const pdf = await loadingTask.promise;

    const resultRows: RecognizedImportRow[] = [];

    // Recorrer cada página del PDF (cada página suele representar una ficha A4 o tabla)
    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const items = textContent.items as Array<{ str: string }>;
        const pageText = items.map((it) => it.str).join(' ');

        // Buscar campos mediante expresiones regulares sobre el texto de la ficha
        const nameMatch = pageText.match(/(?:Nombre|Persona|Alumno|Sujeto|Clienta)[:\s]+([A-Za-zÁ-ú\s]{4,40})/i);
        const refMatch = pageText.match(/(?:Ref|Matrícula|Código|Id)[:\s]+([A-Za-z0-9\-_]{2,15})/i);
        const estaturaMatch = pageText.match(/(?:Estatura|Altura)[:\s]+(\d{2,3}(?:[.,]\d+)?)/i);
        const cuelloMatch = pageText.match(/(?:Cuello|Contorno Cuello)[:\s]+(\d{2,3}(?:[.,]\d+)?)/i);
        const bustoMatch = pageText.match(/(?:Busto|Pecho|Contorno Busto)[:\s]+(\d{2,3}(?:[.,]\d+)?)/i);
        const cinturaMatch = pageText.match(/(?:Cintura|Contorno Cintura)[:\s]+(\d{2,3}(?:[.,]\d+)?)/i);
        const caderaMatch = pageText.match(/(?:Cadera|Contorno Cadera)[:\s]+(\d{2,3}(?:[.,]\d+)?)/i);
        const hombrosMatch = pageText.match(/(?:Hombros|Ancho Hombros)[:\s]+(\d{2,3}(?:[.,]\d+)?)/i);

        if (nameMatch || refMatch || bustoMatch) {
            const rowObj: RecognizedImportRow = {
                tempId: `pdf-page-${pageNum}-${Date.now()}`,
                fullName: nameMatch ? nameMatch[1].trim() : `Ficha A4 Pág. ${pageNum}`,
                referenceId: refMatch ? refMatch[1].trim() : `Pág-${pageNum}`,
                demographicCategory: parseDemographic(pageText),
                groupName: 'Fichas A4 PDF Importadas',
                estatura: estaturaMatch ? parseMeasurementValue(estaturaMatch[1]) : '',
                contornoCuello: cuelloMatch ? parseMeasurementValue(cuelloMatch[1]) : '',
                contornoBusto: bustoMatch ? parseMeasurementValue(bustoMatch[1]) : '',
                contornoCintura: cinturaMatch ? parseMeasurementValue(cinturaMatch[1]) : '',
                contornoCadera: caderaMatch ? parseMeasurementValue(caderaMatch[1]) : '',
                anchoHombros: hombrosMatch ? parseMeasurementValue(hombrosMatch[1]) : '',
                largoTalle: '',
                largoBrazo: '',
                tiro: '',
                warnings: [],
                isDuplicate: false,
            };

            const audit = auditRow(rowObj, existingPersons);
            rowObj.warnings = audit.warnings;
            rowObj.isDuplicate = audit.isDuplicate;

            resultRows.push(rowObj);
        }
    }

    if (resultRows.length === 0) {
        throw new Error('No se detectaron datos de medidas en el documento PDF analizado.');
    }

    return resultRows;
}

/**
 * PARSER 3: Reconocimiento OCR real de fotografías de fichas físicas (Tesseract.js)
 */
export async function parsePhotoOcr(
    files: File[] | Blob[],
    existingPersons: MeasuredPerson[],
    onProgress?: (progressText: string) => void
): Promise<RecognizedImportRow[]> {
    if (!files || files.length === 0) {
        throw new Error('No se seleccionaron imágenes para procesar OCR.');
    }

    onProgress?.('Iniciando motor OCR Tesseract...');
    const worker = await createWorker('spa');

    const resultRows: RecognizedImportRow[] = [];

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            onProgress?.(`Procesando imagen ${i + 1} de ${files.length}...`);

            const ret = await worker.recognize(file as any);
            const text = ret.data.text;

            // Extraer patrones clave del texto OCR manuscrito/impreso
            const nameMatch = text.match(/(?:Nombre|Persona|Alumno|Sujeto)[:\s]+([A-Za-zÁ-ú\s]{3,35})/i);
            const refMatch = text.match(/(?:Ref|Matrícula|Código|Id)[:\s]+([A-Za-z0-9\-_]{2,15})/i);
            const estaturaMatch = text.match(/(?:Estatura|Altura)[:\s]+(\d{2,3}(?:[.,]\d+)?)/i);
            const cuelloMatch = text.match(/(?:Cuello)[:\s]+(\d{2,3}(?:[.,]\d+)?)/i);
            const bustoMatch = text.match(/(?:Busto|Pecho)[:\s]+(\d{2,3}(?:[.,]\d+)?)/i);
            const cinturaMatch = text.match(/(?:Cintura)[:\s]+(\d{2,3}(?:[.,]\d+)?)/i);
            const caderaMatch = text.match(/(?:Cadera)[:\s]+(\d{2,3}(?:[.,]\d+)?)/i);
            const hombrosMatch = text.match(/(?:Hombros)[:\s]+(\d{2,3}(?:[.,]\d+)?)/i);

            const rowObj: RecognizedImportRow = {
                tempId: `ocr-img-${i + 1}-${Date.now()}`,
                fullName: nameMatch ? nameMatch[1].trim() : `Foto ${i + 1}`,
                referenceId: refMatch ? refMatch[1].trim() : `FOTO-${i + 1}`,
                demographicCategory: parseDemographic(text),
                groupName: 'Captura OCR Fotos',
                estatura: estaturaMatch ? parseMeasurementValue(estaturaMatch[1]) : '',
                contornoCuello: cuelloMatch ? parseMeasurementValue(cuelloMatch[1]) : '',
                contornoBusto: bustoMatch ? parseMeasurementValue(bustoMatch[1]) : '',
                contornoCintura: cinturaMatch ? parseMeasurementValue(cinturaMatch[1]) : '',
                contornoCadera: caderaMatch ? parseMeasurementValue(caderaMatch[1]) : '',
                anchoHombros: hombrosMatch ? parseMeasurementValue(hombrosMatch[1]) : '',
                largoTalle: '',
                largoBrazo: '',
                tiro: '',
                warnings: [],
                isDuplicate: false,
            };

            const audit = auditRow(rowObj, existingPersons);
            rowObj.warnings = audit.warnings;
            rowObj.isDuplicate = audit.isDuplicate;

            resultRows.push(rowObj);
        }
    } finally {
        await worker.terminate();
    }

    if (resultRows.length === 0) {
        throw new Error('El reconocimiento OCR no detectó cotas legibles en las imágenes.');
    }

    return resultRows;
}

