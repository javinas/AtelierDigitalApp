// ==============================================================================
// ATELIER DIGITAL — SERVICIO: GENERADOR DE FICHAS IMPRIMIBLES A4 (FASE 3)
// Archivo: src/services/printableSheetService.ts
// ==============================================================================
// Genera documentos HTML listos para imprimir en formato físico A4 (210 × 297 mm),
// tanto individuales como en paquete completo para jornadas grupales.
// Identidad visual de Alta Costura: Marfil, Negro Atelier, Oro Champagne y Arena.
// ==============================================================================

import { MeasurementCampaign, MeasurementCampaignParticipant } from '../types/pattern/measurementCampaign';
import { MeasurementTemplate } from '../types/pattern/measurementTemplate';
import { MeasuredPerson, DEMOGRAPHIC_LABELS } from '../types/personGroup';
import { MASTER_MEASUREMENT_CATALOG, MEASUREMENT_MAP } from '../engine/pattern/catalog/masterCatalog';
import { getStandardSizeEntry } from '../engine/pattern/catalog/standardReferenceSizes';

interface PrintableSheetOptions {
    campaign: MeasurementCampaign;
    template: MeasurementTemplate;
    participants: MeasurementCampaignParticipant[];
    clientName: string;
    singlePersonId?: string | null;
}

/**
 * Genera el documento HTML completo con estilo editorial de alta costura optimizado para A4.
 */
export function generatePrintableSheetsHtml(options: PrintableSheetOptions): string {
    const { campaign, template, participants, clientName, singlePersonId } = options;

    let targetParticipants = participants;
    if (singlePersonId) {
        targetParticipants = participants.filter((p) => p.person_id === singlePersonId || p.person?.id === singlePersonId);
    }

    if (targetParticipants.length === 0) {
        return `<html><body><p>No se encontraron personas para imprimir en esta jornada.</p></body></html>`;
    }

    const pagesHtml = targetParticipants.map((part, index) => {
        const person = part.person || {
            id: part.person_id,
            client_id: campaign.client_id,
            full_name: 'Persona sin nombre',
            demographic_category: 'woman',
            reference_id: null,
            notes: null,
            is_active: true,
            created_at: '',
            updated_at: '',
        };

        const demoLabel = DEMOGRAPHIC_LABELS[person.demographic_category] || person.demographic_category;
        const standardSize = part.standard_size || (campaign.mode === 'standard_only' ? 'M' : null);
        
        // Obtener valores estándar si existen
        let standardValues: Record<string, number> = {};
        if (standardSize) {
            const entry = getStandardSizeEntry(person.demographic_category, standardSize);
            if (entry) {
                standardValues = entry.measurementsCm;
            }
        }

        // Medidas de la plantilla
        const measurementItems = template.measurement_codes
            .map((code) => MEASUREMENT_MAP[code])
            .filter(Boolean);

        return `
        <div class="sheet-page">
            <!-- Encabezado de Alta Costura -->
            <div class="sheet-header">
                <div class="brand-left">
                    <div class="brand-super">ATELIER DE ALTA COSTURA · BY KATHERINE CARROLL</div>
                    <div class="brand-title">FICHA TÉCNICA DE MEDICIÓN CORPORAL</div>
                    <div class="brand-sub">MÓDULO 02 · JORNADA DE TALLAJE Y CAPTURA ANATÓMICA</div>
                </div>
                <div class="brand-right">
                    <div class="campaign-badge">JORNADA OFICIAL</div>
                    <div class="date-text">Fecha: ${campaign.campaign_date || new Date().toISOString().split('T')[0]}</div>
                </div>
            </div>

            <!-- Ficha de Datos del Sujeto Medido -->
            <div class="info-grid">
                <div class="info-cell cell-full">
                    <span class="label">SUJETO MEDIDO:</span>
                    <span class="value-name">${person.full_name}</span>
                    ${person.reference_id ? `<span class="tag-ref">Ref / Código: ${person.reference_id}</span>` : ''}
                </div>
                <div class="info-cell">
                    <span class="label">CLIENTE / RESPONSABLE:</span>
                    <span class="value">${clientName}</span>
                </div>
                <div class="info-cell">
                    <span class="label">GRUPO / NÚCLEO:</span>
                    <span class="value">${campaign.group_name || 'Grupo Oficial'}</span>
                </div>
                <div class="info-cell">
                    <span class="label">CATEGORÍA ANATÓMICA:</span>
                    <span class="value">${demoLabel}</span>
                </div>
                <div class="info-cell">
                    <span class="label">PLANTILLA Y PROTOCOLO:</span>
                    <span class="value">${template.name} (${template.measurement_codes.length} cotas)</span>
                </div>
                <div class="info-cell">
                    <span class="label">TALLA BASE DE REFERENCIA:</span>
                    <span class="value-highlight">${standardSize ? `Talla ${standardSize}` : 'Sin talla (Medición Directa)'}</span>
                </div>
                <div class="info-cell">
                    <span class="label">UNIDAD DE TRABAJO:</span>
                    <span class="value">${campaign.unit_system ? campaign.unit_system.toUpperCase() : 'CM'}</span>
                </div>
            </div>

            <!-- Tabla de Medidas con Espacio para Escritura Manual -->
            <div class="table-container">
                <table class="measurements-table">
                    <thead>
                        <tr>
                            <th style="width: 5%;">#</th>
                            <th style="width: 35%;">COTA ANATÓMICA Y CÓDIGO</th>
                            <th style="width: 20%;">REF. ESTÁNDAR</th>
                            <th style="width: 25%;">MEDIDA REAL / AJUSTE FÍSICO</th>
                            <th style="width: 15%;">ESTADO</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${measurementItems.map((m, idx) => {
                            const refVal = standardValues[m.code];
                            const isReq = template.required_codes.includes(m.code);
                            const capturedVal = part.captured_values ? (typeof part.captured_values[m.code] === 'object' ? (part.captured_values[m.code] as any).value : part.captured_values[m.code]) : null;

                            return `
                            <tr>
                                <td class="text-center text-muted">${idx + 1}</td>
                                <td>
                                    <div class="meas-name">${m.name} ${isReq ? '<span class="req-star">*</span>' : ''}</div>
                                    <div class="meas-sub">${m.instructions || m.anatomical_landmarks || m.code}</div>
                                </td>
                                <td class="text-center font-mono">
                                    ${refVal !== undefined ? `${refVal} cm` : '<span class="text-muted">—</span>'}
                                </td>
                                <td>
                                    <div class="write-box">
                                        ${capturedVal !== null && capturedVal !== undefined ? `<span class="captured-val">${capturedVal}</span>` : '<span class="dotted-line">........................................</span>'}
                                    </div>
                                </td>
                                <td class="text-center">
                                    <div class="checkbox-box"></div>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>

            <!-- Cuaderno de Observaciones y Asimetrías -->
            <div class="observations-block">
                <div class="obs-title">OBSERVACIONES POSTURALES, ASIMETRÍAS Y AJUSTES DE TALLER:</div>
                <div class="obs-lines">
                    <div class="obs-line">${part.notes || person.notes || ''}</div>
                    <div class="obs-line"></div>
                </div>
            </div>

            <!-- Firmas y Pie de Ficha -->
            <div class="sheet-footer">
                <div class="sign-box">
                    <div class="sign-line"></div>
                    <div class="sign-label">Firma de la Diseñadora / Medidor</div>
                </div>
                <div class="sign-box">
                    <div class="sign-line"></div>
                    <div class="sign-label">Conformidad del Responsable / Sujeto</div>
                </div>
                <div class="folio-box">
                    Hoja ${index + 1} de ${targetParticipants.length} · ID: ${part.id ? part.id.slice(0, 8) : 'TEMP'}
                </div>
            </div>
        </div>
        `;
    }).join('\n');

    return `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>Fichas de Medición — ${campaign.title}</title>
        <style>
            @page {
                size: A4 portrait;
                margin: 10mm;
            }
            * {
                box-sizing: border-box;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
            }
            body {
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                background-color: #555555;
                margin: 0;
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 20px;
            }
            .sheet-page {
                width: 210mm;
                min-height: 297mm;
                padding: 14mm 15mm;
                background-color: #F8F2E9; /* Marfil #F8F2E9 */
                border: 1px solid #E6D9C8; /* Arena #E6D9C8 */
                box-shadow: 0 4px 15px rgba(0,0,0,0.15);
                display: flex;
                flex-direction: column;
                justify-content: space-between;
                page-break-after: always;
            }
            @media print {
                body {
                    background-color: transparent;
                    padding: 0;
                }
                .sheet-page {
                    border: none;
                    box-shadow: none;
                    width: 100%;
                    min-height: 100vh;
                    padding: 10mm 12mm;
                    page-break-after: always;
                }
                .no-print {
                    display: none !important;
                }
            }
            .sheet-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                border-bottom: 2px solid #171411; /* Negro #171411 */
                padding-bottom: 8px;
                margin-bottom: 12px;
            }
            .brand-super {
                font-size: 8pt;
                font-weight: 700;
                letter-spacing: 1.5px;
                color: #A78350; /* Champagne #A78350 */
                margin-bottom: 3px;
            }
            .brand-title {
                font-size: 14pt;
                font-weight: 700;
                color: #171411;
                letter-spacing: 0.5px;
            }
            .brand-sub {
                font-size: 7.5pt;
                color: #766B62;
                margin-top: 2px;
            }
            .campaign-badge {
                background-color: #171411;
                color: #FFFFFF;
                font-size: 7pt;
                font-weight: 700;
                padding: 3px 8px;
                border-radius: 2px;
                text-align: right;
                letter-spacing: 0.5px;
                display: inline-block;
            }
            .date-text {
                font-size: 7.5pt;
                color: #766B62;
                margin-top: 4px;
                text-align: right;
            }
            .info-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 5px 12px;
                background-color: #FFFFFF;
                border: 1px solid #E6D9C8;
                padding: 8px 12px;
                border-radius: 4px;
                margin-bottom: 12px;
            }
            .cell-full {
                grid-column: span 2;
                border-bottom: 1px solid #F0E6D8;
                padding-bottom: 4px;
                margin-bottom: 2px;
            }
            .label {
                font-size: 7pt;
                font-weight: 700;
                color: #A78350;
                letter-spacing: 0.5px;
                display: block;
            }
            .value {
                font-size: 9pt;
                font-weight: 600;
                color: #171411;
            }
            .value-name {
                font-size: 11pt;
                font-weight: 700;
                color: #171411;
            }
            .value-highlight {
                font-size: 9pt;
                font-weight: 700;
                color: #8C6826;
            }
            .tag-ref {
                margin-left: 10px;
                background-color: #FAF5EE;
                border: 1px solid #E6D9C8;
                padding: 2px 6px;
                border-radius: 3px;
                font-size: 7.5pt;
                color: #766B62;
                font-weight: 600;
            }
            .table-container {
                flex: 1;
                margin-bottom: 10px;
            }
            .measurements-table {
                width: 100%;
                border-collapse: collapse;
                background-color: #FFFFFF;
                border: 1px solid #E6D9C8;
            }
            .measurements-table th {
                background-color: #171411;
                color: #F8F2E9;
                font-size: 7pt;
                font-weight: 700;
                letter-spacing: 0.5px;
                padding: 5px 6px;
                text-align: left;
                border: 1px solid #171411;
            }
            .measurements-table td {
                padding: 4px 6px;
                font-size: 8pt;
                border-bottom: 1px solid #EFE6DA;
                color: #171411;
            }
            .text-center { text-align: center; }
            .text-muted { color: #888888; }
            .font-mono { font-family: 'Courier New', Courier, monospace; font-size: 8.5pt; }
            .meas-name {
                font-weight: 700;
                color: #171411;
            }
            .meas-sub {
                font-size: 6.5pt;
                color: #766B62;
            }
            .req-star {
                color: #A78350;
                font-weight: 700;
            }
            .write-box {
                border-bottom: 1px dashed #A78350;
                min-height: 18px;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .captured-val {
                font-weight: 700;
                font-size: 9.5pt;
                color: #171411;
            }
            .dotted-line {
                color: #C0B09A;
                letter-spacing: 2px;
            }
            .checkbox-box {
                width: 12px;
                height: 12px;
                border: 1px solid #888888;
                margin: 0 auto;
                border-radius: 2px;
            }
            .observations-block {
                background-color: #FFFFFF;
                border: 1px solid #E6D9C8;
                padding: 6px 10px;
                border-radius: 4px;
                margin-bottom: 12px;
            }
            .obs-title {
                font-size: 7pt;
                font-weight: 700;
                color: #A78350;
                letter-spacing: 0.5px;
                margin-bottom: 4px;
            }
            .obs-line {
                border-bottom: 1px solid #EFE6DA;
                min-height: 16px;
                font-size: 8pt;
                color: #171411;
            }
            .sheet-footer {
                display: flex;
                justify-content: space-between;
                align-items: flex-end;
                border-top: 1px solid #E6D9C8;
                padding-top: 8px;
            }
            .sign-box {
                width: 38%;
            }
            .sign-line {
                border-bottom: 1px solid #171411;
                margin-bottom: 3px;
                height: 25px;
            }
            .sign-label {
                font-size: 6.5pt;
                color: #766B62;
                text-align: center;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            .folio-box {
                font-size: 6.5pt;
                color: #999999;
                text-align: right;
            }
            .print-floating-bar {
                position: fixed;
                top: 10px;
                right: 20px;
                background-color: #171411;
                padding: 10px 16px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                z-index: 10000;
                display: flex;
                gap: 10px;
                align-items: center;
            }
            .print-btn {
                background-color: #A78350;
                color: #FFFFFF;
                border: none;
                padding: 8px 14px;
                border-radius: 4px;
                font-weight: 700;
                font-size: 12px;
                cursor: pointer;
            }
            .close-print-btn {
                background-color: transparent;
                color: #FFFFFF;
                border: 1px solid #444444;
                padding: 7px 12px;
                border-radius: 4px;
                font-size: 12px;
                cursor: pointer;
            }
        </style>
    </head>
    <body>
        <div class="print-floating-bar no-print">
            <span style="color: #FFFFFF; font-size: 12px; font-weight: 600;">
                ${targetParticipants.length === 1 ? 'Ficha Individual A4' : `Paquete Completo (${targetParticipants.length} Fichas A4)`}
            </span>
            <button class="print-btn" onclick="window.print()">🖨️ IMPRIMIR / PDF</button>
            <button class="close-print-btn" onclick="window.close()">✕ Cerrar</button>
        </div>
        ${pagesHtml}
    </body>
    </html>
    `;
}

/**
 * Abre el documento HTML generado en una nueva ventana para imprimir o guardar como PDF.
 */
export function printSheetsDocument(options: PrintableSheetOptions): boolean {
    const html = generatePrintableSheetsHtml(options);
    if (typeof window !== 'undefined' && window.open) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.focus();
            return true;
        }
    }
    return false;
}
