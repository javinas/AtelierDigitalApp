// ==============================================================================
// ATELIER DIGITAL — EXPORTADOR DE SESIONES DE MEDIDAS Y MANIQUÍES (M02.A)
// Archivo: src/engine/pattern/export/measurementSessionExporter.ts
// ==============================================================================
// Provee exportación en cuatro formatos de alta costura:
// 1. Ficha Anatómica Imprimible / PDF (A4 multi-página estilizada de atelier).
// 2. Maniquí Anatómico Anotado en formato vectorial SVG independiente 1:1.
// 3. Listado Completo de Medidas de la Sesión en formato tabular CSV.
// 4. Matriz de Cobertura del Catálogo Antropométrico en formato CSV.
// ==============================================================================

import { MeasurementSession } from '../../../types/pattern/measurement';
import {
    MASTER_MEASUREMENT_CATALOG,
    WORKSHOP_PARAMETER_CODES,
    WORKSHOP_PARAMETER_DEFINITIONS,
    BODY_MEASUREMENT_CODES,
    DESIGN_PARAMETER_CODES,
} from '../catalog/masterCatalog';

function roundTo(val: number, decimals: number = 1): number {
    const factor = Math.pow(10, decimals);
    return Math.round(val * factor) / factor;
}
import {
    AnatomicalPerspective,
    formatAnatomicalMeasure,
    computeScreenAnatomicalCoordinates,
    resolveAntiCollisionLabelPositions,
    isCotaCompatibleWithPerspective,
    isCotaVisibleInTorsoView,
} from '../catalog/anatomicalMapping';
import {
    getMeasurementCoverageDetail,
    exportCoverageMatrixCsv,
} from '../catalog/anatomicalCoverageMatrix';

export interface MeasurementExportOptions {
    clientName?: string;
    session: MeasurementSession | null;
    activeMeasurementsMm?: Record<string, number>;
    measurementsMm?: Record<string, number>;
    viewMode: 'full_body' | 'torso';
    perspective: AnatomicalPerspective;
    demographic?: 'woman' | 'man' | 'girl' | 'boy';
    showMmEquivalencies?: boolean;
}

/**
 * Genera el documento HTML imprimible para la Ficha Anatómica de la Sesión (Guardar como PDF)
 */
export function generateAnatomicalDossierHtml(options: MeasurementExportOptions): string {
    const {
        clientName = 'Clienta de Alta Costura',
        session,
        viewMode,
        perspective,
        demographic = 'woman',
    } = options;
    const activeMeasurementsMm = options.activeMeasurementsMm || options.measurementsMm || {};

    const dateStr = session?.session_date
        ? new Date(session.session_date).toLocaleDateString('es-ES', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
          })
        : 'Fecha no registrada';

    const versionStr = `v${session?.version_number || 1}.0`;
    const statusLabel =
        session?.status === 'completed'
            ? 'FINALIZADA Y VERIFICADA'
            : session?.status === 'archived'
            ? 'HISTÓRICA ARCHIVADA'
            : 'BORRADOR DE TALLER';

    // Generar SVG del maniquí para incrustarlo en la ficha
    const mannequinSvg = generateStandaloneMannequinSvg(options, 420, 590);

    // Tablas de medidas corporales
    const bodyRows = BODY_MEASUREMENT_CODES.map((code) => {
        const item = MASTER_MEASUREMENT_CATALOG.find((m) => m.code === code);
        const valMm = activeMeasurementsMm[code];
        const hasVal = typeof valMm === 'number' && Number.isFinite(valMm) && valMm > 0;
        const coverage = getMeasurementCoverageDetail(code, viewMode, perspective);

        return `
            <tr>
                <td class="code-cell">${code}</td>
                <td class="name-cell">${item?.name || code}</td>
                <td class="val-cell ${hasVal ? 'val-present' : 'val-missing'}">
                    ${hasVal ? `${roundTo(valMm / 10, 1)} cm` : 'No registrada'}
                </td>
                <td class="mm-cell">${hasVal ? `${Math.round(valMm)} mm` : '—'}</td>
                <td class="coverage-cell"><span class="badge ${coverage.statusInCurrentView}">${coverage.badgeLabel}</span></td>
            </tr>
        `;
    }).join('');

    // Tablas de medidas de diseño
    const designRows = DESIGN_PARAMETER_CODES.map((code) => {
        const item = MASTER_MEASUREMENT_CATALOG.find((m) => m.code === code);
        const valMm = activeMeasurementsMm[code];
        const hasVal = typeof valMm === 'number' && Number.isFinite(valMm) && valMm > 0;

        return `
            <tr>
                <td class="code-cell">${code}</td>
                <td class="name-cell">${item?.name || code}</td>
                <td class="val-cell ${hasVal ? 'val-present' : 'val-missing'}">
                    ${hasVal ? `${roundTo(valMm / 10, 1)} cm` : 'No registrada'}
                </td>
                <td class="mm-cell">${hasVal ? `${Math.round(valMm)} mm` : '—'}</td>
                <td class="coverage-cell"><span class="badge not_applicable">Medida de diseño</span></td>
            </tr>
        `;
    }).join('');

    // Tablas de parámetros de taller
    const workshopRows = WORKSHOP_PARAMETER_CODES.map((code) => {
        const def = WORKSHOP_PARAMETER_DEFINITIONS[code];
        const valMm = activeMeasurementsMm[code] ?? def?.defaultValMm ?? 0;
        const isSmall = valMm < 10;
        const displayVal = isSmall ? `${Math.round(valMm)} mm` : `${roundTo(valMm / 10, 1)} cm`;
        const equiv = isSmall ? `(${roundTo(valMm / 10, 1)} cm)` : `(${Math.round(valMm)} mm)`;

        return `
            <tr>
                <td class="code-cell">${code}</td>
                <td class="name-cell">${def?.name || code}</td>
                <td class="val-cell val-present">${displayVal}</td>
                <td class="mm-cell">${equiv}</td>
                <td class="coverage-cell"><span class="badge not_applicable">Parámetro de taller</span></td>
            </tr>
        `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Ficha Anatómica — ${clientName} (${versionStr}) — Atelier Katherine Carroll</title>
    <style>
        @page {
            size: A4;
            margin: 15mm 15mm 15mm 15mm;
        }
        * {
            box-sizing: border-box;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            color: #121316;
            background-color: #FFFFFF;
            margin: 0;
            padding: 0;
            font-size: 11px;
            line-height: 1.4;
        }
        .header-dossier {
            border-bottom: 2px solid #C5A059;
            padding-bottom: 12px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .brand-title {
            font-size: 18px;
            font-weight: 700;
            letter-spacing: 2px;
            color: #121316;
            margin: 0 0 2px 0;
        }
        .brand-sub {
            font-size: 10px;
            letter-spacing: 1.5px;
            color: #A78350;
            text-transform: uppercase;
            font-weight: 600;
        }
        .meta-box {
            text-align: right;
            font-size: 10px;
            color: #555555;
        }
        .client-name-hero {
            font-size: 14px;
            font-weight: 700;
            color: #121316;
        }
        .status-pill {
            display: inline-block;
            padding: 2px 6px;
            background: #FAF7F2;
            border: 1px solid #EADFCF;
            border-radius: 3px;
            font-weight: 700;
            color: #996B1F;
            font-size: 9px;
            margin-top: 3px;
        }
        .page-break {
            page-break-before: always;
        }
        .visual-section {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        .mannequin-col {
            flex: 0 0 420px;
            background: #14161A;
            border: 1px solid #332B1A;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
        }
        .mannequin-caption {
            font-size: 9px;
            color: #E5C788;
            letter-spacing: 1px;
            text-transform: uppercase;
            margin-top: 6px;
        }
        .summary-col {
            flex: 1;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .hero-metric-card {
            background: #FAF7F2;
            border: 1px solid #EADFCF;
            border-radius: 6px;
            padding: 10px;
            text-align: center;
        }
        .hero-label {
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 1px;
            color: #8C7355;
            text-transform: uppercase;
        }
        .hero-val {
            font-size: 22px;
            font-weight: 700;
            color: #121316;
            margin: 4px 0 2px 0;
        }
        .table-section {
            margin-bottom: 24px;
            page-break-inside: avoid;
            break-inside: avoid;
        }
        .section-title {
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1px;
            color: #121316;
            text-transform: uppercase;
            border-left: 3px solid #C5A059;
            padding-left: 8px;
            margin: 16px 0 8px 0;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            font-size: 10px;
        }
        th {
            background: #FAF7F2;
            border-bottom: 1.5px solid #EADFCF;
            text-align: left;
            padding: 6px 8px;
            font-weight: 700;
            color: #665C50;
            text-transform: uppercase;
            font-size: 9px;
            letter-spacing: 0.5px;
        }
        td {
            padding: 5px 8px;
            border-bottom: 1px solid #F0ECE4;
        }
        tr:nth-child(even) td {
            background: #FCFBF9;
        }
        .code-cell {
            font-family: monospace;
            font-size: 9px;
            color: #777777;
        }
        .name-cell {
            font-weight: 600;
            color: #121316;
        }
        .val-cell {
            font-weight: 700;
            text-align: right;
        }
        .val-present {
            color: #121316;
        }
        .val-missing {
            color: #A0998E;
            font-style: italic;
            font-weight: normal;
        }
        .mm-cell {
            text-align: right;
            color: #777777;
            font-size: 9px;
        }
        .coverage-cell {
            text-align: center;
        }
        .badge {
            display: inline-block;
            padding: 1px 5px;
            border-radius: 3px;
            font-size: 8px;
            font-weight: 600;
            text-transform: uppercase;
        }
        .badge.current_view {
            background: #EDF5EE;
            color: #2E6930;
            border: 1px solid #D3E8D6;
        }
        .badge.other_view {
            background: #FFFDF0;
            color: #996B1F;
            border: 1px solid #EADFCF;
        }
        .badge.table_only {
            background: #F4F4F4;
            color: #666666;
            border: 1px solid #E2E2E2;
        }
        .badge.not_applicable {
            background: #FAF7F2;
            color: #8C7355;
            border: 1px solid #EFEAE2;
        }
        .footer-dossier {
            margin-top: 24px;
            border-top: 1px solid #EADFCF;
            padding-top: 8px;
            font-size: 8px;
            color: #888888;
            display: flex;
            justify-content: space-between;
        }
    </style>
</head>
<body>
    <div class="header-dossier">
        <div>
            <h1 class="brand-title">ATELIER DIGITAL</h1>
            <div class="brand-sub">BY KATHERINE CARROLL · ALTA COSTURA</div>
        </div>
        <div class="meta-box">
            <div class="client-name-hero">${clientName}</div>
            <div>Sesión Antropométrica ${versionStr} · ${dateStr}</div>
            <div class="status-pill">${statusLabel}</div>
        </div>
    </div>

    <div class="visual-section">
        <div class="mannequin-col">
            ${mannequinSvg}
            <div class="mannequin-caption">
                ${viewMode === 'torso' ? 'Torso Stockman' : 'Cuerpo Completo'} · Vista ${perspective === 'front' ? 'Frontal' : 'Posterior'} (${demographic.toUpperCase()})
            </div>
        </div>
        <div class="summary-col">
            <div class="hero-metric-card">
                <div class="hero-label">Contorno de Busto</div>
                <div class="hero-val">${activeMeasurementsMm.contorno_busto ? `${roundTo(activeMeasurementsMm.contorno_busto / 10, 1)} cm` : 'No reg.'}</div>
                <div style="font-size: 9px; color: #777;">${activeMeasurementsMm.contorno_busto ? `${Math.round(activeMeasurementsMm.contorno_busto)} mm` : ''}</div>
            </div>
            <div class="hero-metric-card">
                <div class="hero-label">Contorno de Cintura</div>
                <div class="hero-val">${activeMeasurementsMm.contorno_cintura ? `${roundTo(activeMeasurementsMm.contorno_cintura / 10, 1)} cm` : 'No reg.'}</div>
                <div style="font-size: 9px; color: #777;">${activeMeasurementsMm.contorno_cintura ? `${Math.round(activeMeasurementsMm.contorno_cintura)} mm` : ''}</div>
            </div>
            <div class="hero-metric-card">
                <div class="hero-label">Contorno de Cadera</div>
                <div class="hero-val">${activeMeasurementsMm.contorno_cadera ? `${roundTo(activeMeasurementsMm.contorno_cadera / 10, 1)} cm` : 'No reg.'}</div>
                <div style="font-size: 9px; color: #777;">${activeMeasurementsMm.contorno_cadera ? `${Math.round(activeMeasurementsMm.contorno_cadera)} mm` : ''}</div>
            </div>
            <div style="background: #FAF7F2; border: 1px solid #EADFCF; border-radius: 6px; padding: 10px; font-size: 9px; color: #665C50;">
                <strong>Nota técnica de atelier:</strong> Esta ficha consolida las cotas registradas en milímetros de alta costura, formateadas a centímetros para consulta sastre. Valores no registrados se indican explícitamente sin imputar cero.
            </div>
        </div>
    </div>

    <div class="table-section">
        <div class="section-title">Medidas Corporales de la Clienta (33 Parámetros Antropométricos)</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 25%;">Código Canónico</th>
                    <th style="width: 35%;">Nombre de Medida</th>
                    <th style="width: 15%; text-align: right;">Valor (cm)</th>
                    <th style="width: 12%; text-align: right;">Precisión (mm)</th>
                    <th style="width: 13%; text-align: center;">Representación</th>
                </tr>
            </thead>
            <tbody>
                ${bodyRows}
            </tbody>
        </table>
    </div>

    <div class="table-section page-break">
        <div class="section-title">Medidas de Diseño de Prenda</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 25%;">Código Canónico</th>
                    <th style="width: 35%;">Nombre de Medida</th>
                    <th style="width: 15%; text-align: right;">Valor (cm)</th>
                    <th style="width: 12%; text-align: right;">Precisión (mm)</th>
                    <th style="width: 13%; text-align: center;">Representación</th>
                </tr>
            </thead>
            <tbody>
                ${designRows}
            </tbody>
        </table>

        <div class="section-title" style="margin-top: 24px;">Parámetros Técnicos de Taller y Confección</div>
        <table>
            <thead>
                <tr>
                    <th style="width: 25%;">Código Canónico</th>
                    <th style="width: 35%;">Parámetro de Confección</th>
                    <th style="width: 15%; text-align: right;">Valor Taller</th>
                    <th style="width: 12%; text-align: right;">Equivalencia</th>
                    <th style="width: 13%; text-align: center;">Representación</th>
                </tr>
            </thead>
            <tbody>
                ${workshopRows}
            </tbody>
        </table>

        <div class="footer-dossier">
            <div>Atelier Digital — By Katherine Carroll · Módulo 02: Alta Costura y Patronaje Paramétrico</div>
            <div>Documento generado para corte sastre y fitting · Inmutable</div>
        </div>
    </div>
</body>
</html>`;
}

/**
 * Genera el SVG anotado independiente del maniquí para la vista actual (Exportación B)
 */
export function generateStandaloneMannequinSvg(
    options: MeasurementExportOptions,
    width: number = 600,
    height: number = 840
): string {
    const {
        clientName = 'Clienta',
        session,
        viewMode,
        perspective,
        demographic = 'woman',
    } = options;
    const activeMeasurementsMm = options.activeMeasurementsMm || options.measurementsMm || {};

    const CX = width / 2;
    const coords = computeScreenAnatomicalCoordinates(activeMeasurementsMm, demographic, width, height);
    const coordsList = Object.values(coords);

    const left = resolveAntiCollisionLabelPositions(coordsList, 'left', width, height);
    const right = resolveAntiCollisionLabelPositions(coordsList, 'right', width, height);
    const allLabels = [...left, ...right];

    // Filtrar estrictamente según perspectiva y modo de vista
    const visibleLabels = allLabels.filter((item) => {
        const matchesPerspective = isCotaCompatibleWithPerspective(item.code, perspective);
        if (!matchesPerspective) return false;
        if (viewMode === 'torso') {
            return isCotaVisibleInTorsoView(item.zone, item.code);
        }
        return true;
    });

    const linesSvg = visibleLabels
        .map((item) => {
            const isReg = item.isRegistered;
            const strokeColor = item.isPrimary ? '#E5C788' : isReg ? '#38BDF8' : '#64748B';
            return `
        <!-- Cota: ${item.code} -->
        <path d="M ${item.lineEndX} ${item.lineEndY} L ${item.turnX} ${item.lineEndY} L ${item.lineStartX} ${item.lineStartY}"
              fill="none" stroke="${strokeColor}" stroke-width="1.2" stroke-dasharray="${isReg ? 'none' : '2,3'}" opacity="0.85" />
        <circle cx="${item.anchorX}" cy="${item.anchorY}" r="${item.isPrimary ? '4' : '2.8'}" fill="${strokeColor}" />
        <circle cx="${item.lineEndX}" cy="${item.lineEndY}" r="2" fill="${strokeColor}" />
        <rect x="${item.badgeX}" y="${item.badgeY}" width="${item.badgeWidth}" height="${item.badgeHeight}" rx="4"
              fill="#1A1C23" stroke="${strokeColor}" stroke-width="1" />
        <text x="${item.badgeX + 6}" y="${item.badgeY + 14}" fill="#EADFCF" font-size="8" font-family="sans-serif" font-weight="bold">${item.label}</text>
        <text x="${item.badgeX + 6}" y="${item.badgeY + 28}" fill="${isReg ? '#FFFFFF' : '#888888'}" font-size="10" font-family="sans-serif" font-weight="bold">
            ${item.valueFormatted}${item.unit ? ` ${item.unit}` : ''}
        </text>
        `;
        })
        .join('');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
    <rect width="${width}" height="${height}" fill="#14161A" />
    <text x="20" y="30" fill="#E5C788" font-size="12" font-family="sans-serif" font-weight="bold" letter-spacing="1">ATELIER DIGITAL — MANIQUÍ ANATÓMICO</text>
    <text x="20" y="46" fill="#A0998E" font-size="9" font-family="sans-serif">${clientName} · ${session?.session_date ? session.session_date.split('T')[0] : 'Sin fecha'} · Vista ${perspective === 'front' ? 'Frontal' : 'Posterior'}</text>

    <!-- Silueta esquemática de maniquí de atelier -->
    <ellipse cx="${CX}" cy="70" rx="22" ry="28" fill="#252420" stroke="#C5A059" stroke-width="1.2" />
    <path d="M ${CX - 16} 126 L ${CX - 70} 160 L ${CX - 60} 250 L ${CX - 40} 360 L ${CX - 65} 470 L ${CX} 510 L ${CX + 65} 470 L ${CX + 40} 360 L ${CX + 60} 250 L ${CX + 70} 160 L ${CX + 16} 126 Z"
          fill="#1C1B18" stroke="#D4AF37" stroke-width="1.5" />
    <line x1="${CX}" y1="30" x2="${CX}" y2="${height - 40}" stroke="rgba(212, 175, 55, 0.25)" stroke-dasharray="4,6" />

    <!-- Directrices y cotas visibles compatibles -->
    ${linesSvg}

    <!-- Cuadrado de calibración física obligatoria de 100 × 100 mm -->
    <g transform="translate(20, ${height - 120})">
        <rect width="100" height="100" fill="none" stroke="#C5A059" stroke-width="1.5" stroke-dasharray="2,2" />
        <text x="50" y="48" fill="#E5C788" font-size="8" font-family="sans-serif" text-anchor="middle" font-weight="bold">CALIBRACIÓN</text>
        <text x="50" y="62" fill="#E5C788" font-size="7" font-family="sans-serif" text-anchor="middle">100 x 100 mm</text>
    </g>
</svg>`;
}

/**
 * Genera el archivo CSV con todas las medidas registradas y analizadas de la sesión (Exportación C)
 */
export function generateMeasurementsCsv(options: MeasurementExportOptions): string {
    const {
        clientName = 'Clienta',
        session,
        viewMode,
        perspective,
    } = options;
    const activeMeasurementsMm = options.activeMeasurementsMm || options.measurementsMm || {};

    const sessVersion = `v${session?.version_number || 1}.0`;
    const sessDate = session?.session_date ? session.session_date.split('T')[0] : 'Sin fecha';

    const headers = [
        'Clienta o Perfil',
        'Sesión',
        'Fecha',
        'Código Canónico',
        'Nombre Visible',
        'Categoría',
        'Valor Almacenado (mm)',
        'Valor Presentación (cm)',
        'Unidad',
        'Estado de Registro',
        'Representación en Maniquí',
        'Vistas Compatibles',
        'Visible en Vista Actual',
        'Motivo / Justificación Técnica',
    ];

    const escapeCsv = (str: string) => {
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    const rows: string[] = [];

    // 1. Medidas corporales
    for (const code of BODY_MEASUREMENT_CODES) {
        const item = MASTER_MEASUREMENT_CATALOG.find((m) => m.code === code);
        const valMm = activeMeasurementsMm[code];
        const hasVal = typeof valMm === 'number' && Number.isFinite(valMm) && valMm > 0;
        const coverage = getMeasurementCoverageDetail(code, viewMode, perspective);

        const valStoredStr = hasVal ? Math.round(valMm).toString() : '';
        const valDisplayStr = hasVal ? roundTo(valMm / 10, 1).toString() : 'No registrada';
        const isVisibleStr = coverage.statusInCurrentView === 'current_view' ? 'SÍ' : 'NO';
        const repStr = coverage.hasAnchor ? 'Con Cota Vectorial' : 'Solo Tabla';
        const compatViewsStr = coverage.hasAnchor
            ? `${coverage.supportsTorsoStockman ? 'Torso, ' : ''}${coverage.supportsFullBodyFront ? 'Cuerpo Frente, ' : ''}${coverage.supportsFullBodyBack ? 'Cuerpo Espalda' : ''}`.replace(/, $/, '')
            : 'Solo Tabla';

        rows.push(
            [
                escapeCsv(clientName),
                escapeCsv(sessVersion),
                escapeCsv(sessDate),
                escapeCsv(code),
                escapeCsv(item?.name || code),
                'Corporal',
                valStoredStr,
                escapeCsv(valDisplayStr),
                'cm',
                hasVal ? 'Registrada' : 'No registrada',
                escapeCsv(repStr),
                escapeCsv(compatViewsStr),
                isVisibleStr,
                escapeCsv(coverage.reasonNotVisible || 'Visible y calibrada en el maniquí.'),
            ].join(',')
        );
    }

    // 2. Medidas de diseño
    for (const code of DESIGN_PARAMETER_CODES) {
        const item = MASTER_MEASUREMENT_CATALOG.find((m) => m.code === code);
        const valMm = activeMeasurementsMm[code];
        const hasVal = typeof valMm === 'number' && Number.isFinite(valMm) && valMm > 0;

        rows.push(
            [
                escapeCsv(clientName),
                escapeCsv(sessVersion),
                escapeCsv(sessDate),
                escapeCsv(code),
                escapeCsv(item?.name || code),
                'Diseño',
                hasVal ? Math.round(valMm).toString() : '',
                hasVal ? roundTo(valMm / 10, 1).toString() : 'No registrada',
                'cm',
                hasVal ? 'Registrada' : 'No registrada',
                'No aplicable al maniquí',
                'Tabla de medidas y modelado',
                'NO',
                'Medida de diseño de prenda: se calibra en el patrón.',
            ].join(',')
        );
    }

    // 3. Parámetros de taller
    for (const code of WORKSHOP_PARAMETER_CODES) {
        const def = WORKSHOP_PARAMETER_DEFINITIONS[code];
        const valMm = activeMeasurementsMm[code] ?? def?.defaultValMm ?? 0;
        const isSmall = valMm < 10;
        const valDisplayStr = isSmall ? `${Math.round(valMm)} mm` : `${roundTo(valMm / 10, 1)} cm`;

        rows.push(
            [
                escapeCsv(clientName),
                escapeCsv(sessVersion),
                escapeCsv(sessDate),
                escapeCsv(code),
                escapeCsv(def?.name || code),
                'Taller',
                Math.round(valMm).toString(),
                escapeCsv(valDisplayStr),
                isSmall ? 'mm' : 'cm',
                'Registrada',
                'No aplicable al maniquí',
                'Mesa de corte de taller',
                'NO',
                'Parámetro de taller (holgura o margen de costura).',
            ].join(',')
        );
    }

    return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Disparador universal de descarga para Web
 */
export function downloadFileInBrowser(
    content: string,
    filename: string,
    mimeType: string = 'text/plain;charset=utf-8'
): boolean {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return false;
    }

    try {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return true;
    } catch (err) {
        console.warn('[SessionExporter] Error descargando archivo:', err);
        return false;
    }
}

/**
 * Abre ventana de impresión para la Ficha Anatómica (Guardar como PDF)
 */
export function printAnatomicalDossier(options: MeasurementExportOptions): boolean {
    if (typeof window === 'undefined') return false;

    try {
        const html = generateAnatomicalDossierHtml(options);
        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            // Si el bloqueador de popups impide window.open, descargar como archivo HTML auto-imprimible
            const autoPrintHtml = html.replace('</body>', '<script>window.onload = function() { window.print(); };</script></body>');
            return downloadFileInBrowser(autoPrintHtml, `Ficha_Anatomica_${options.clientName?.replace(/\s+/g, '_') || 'Clienta'}.html`, 'text/html;charset=utf-8');
        }
        printWindow.document.open();
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
        }, 300);
        return true;
    } catch (err) {
        console.warn('[SessionExporter] Error abriendo ficha para impresión:', err);
        return false;
    }
}
