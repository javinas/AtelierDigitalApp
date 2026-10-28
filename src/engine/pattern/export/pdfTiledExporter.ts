// ==============================================================================
// ATELIER DIGITAL — EXPORTADOR EN MOSAICO PARA IMPRESIÓN 1:1 (M02.12)
// Archivo: src/engine/pattern/export/pdfTiledExporter.ts
// ==============================================================================
// Calcula la partición en mosaico para hojas A4 o Carta a escala real 1:1.
// Incluye cuadrado de calibración de 100 x 100 mm, marcas de registro en cruz,
// coordenadas de ensamblado (ej. "Fila 2, Columna 3") y advertencia de no escalar.
// ==============================================================================

import { roundTo } from '../geometry/geometry2d';
import { PatternGeometryResult } from '../geometry/types';
import { exportPatternToSvg } from './svgExporter';
import { PatternStatus } from '../../../types/pattern/pattern';

export type PaperSize = 'a4' | 'letter';

export interface TiledPdfOptions {
    paperSize?: PaperSize;
    marginMm?: number;
    overlapMm?: number;
    title?: string;
    clientName?: string;
    status?: PatternStatus;
    versionLabel?: string;
    productionCoverHtml?: string;
}

export interface TilePageInfo {
    pageNumber: number;
    totalRows: number;
    totalCols: number;
    row: number;
    col: number;
    viewBoxX: number;
    viewBoxY: number;
    viewBoxWidth: number;
    viewBoxHeight: number;
}

export function generateTiledPrintHtml(
    geometry: PatternGeometryResult,
    options: TiledPdfOptions = {}
): string {
    const {
        paperSize = 'a4',
        marginMm = 10,
        overlapMm = 10,
        title = 'Patrón de Alta Costura Atelier Digital',
        clientName = 'Clienta',
        status,
        versionLabel = 'v1.0',
        productionCoverHtml,
    } = options;

    const isApproved = status === 'approved_by_designer';

    // Dimensiones físicas del papel en mm
    const paperWidth = paperSize === 'a4' ? 210 : 215.9;
    const paperHeight = paperSize === 'a4' ? 297 : 279.4;

    // Área útil por hoja
    const usableWidth = paperWidth - marginMm * 2 - overlapMm;
    const usableHeight = paperHeight - marginMm * 2 - overlapMm;

    // SVG completo generado con estatus y metadatos
    const fullSvg = exportPatternToSvg(geometry, {
        includeCalibrationSquare: true,
        marginMm: 30,
        title,
        status,
        clientName,
        versionLabel,
    });

    // Calcular dimensiones totales a cubrir
    const totalContentWidth = geometry.boundingBox.width + 160;
    const totalContentHeight = geometry.boundingBox.height + 200;

    const cols = Math.max(1, Math.ceil(totalContentWidth / usableWidth));
    const rows = Math.max(1, Math.ceil(totalContentHeight / usableHeight));
    const totalPages = cols * rows;

    const pagesHtml: string[] = [];

    // HOJA 1: Ficha Técnica de Taller (si se provee portada)
    if (productionCoverHtml) {
        pagesHtml.push(`
      <div class="page cover-page" id="page-cover">
        ${productionCoverHtml}
      </div>
    `);
    }

    let pageNum = 1;
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const vbX = c * usableWidth;
            const vbY = r * usableHeight;

            const watermarkBadge = !isApproved
                ? `<div class="tile-watermark">BORRADOR TÉCNICO / EN PRUEBA DE VESTUARIO — PROHIBIDO EL CORTE FINAL</div>`
                : '';

            const certTag = isApproved
                ? `<span class="tile-cert-tag">✓ APROBADO CORTE</span>`
                : `<span class="tile-draft-tag">⚠ BORRADOR</span>`;

            pagesHtml.push(`
      <div class="page" id="page-${pageNum}">
        ${watermarkBadge}
        <!-- Encabezado de registro y ensamblado -->
        <div class="tile-header">
          <div class="tile-title">ATELIER DIGITAL · BY KATHERINE CARROLL ${certTag}</div>
          <div class="tile-coords">
            <strong>PÁGINA ${pageNum} DE ${totalPages}</strong> · FILA ${r + 1}/${rows}, COL ${c + 1}/${cols}
          </div>
          <div class="tile-sub">${title} · ${clientName} (${versionLabel}) · ESCALA 100% REAL</div>
        </div>

        <!-- Marcas de registro en las 4 esquinas -->
        <div class="corner-cross cross-tl"></div>
        <div class="corner-cross cross-tr"></div>
        <div class="corner-cross cross-bl"></div>
        <div class="corner-cross cross-br"></div>

        <!-- Ventana de vista SVG de la sección correspondiente -->
        <div class="tile-content">
          <svg
            width="${roundTo(usableWidth)}mm"
            height="${roundTo(usableHeight)}mm"
            viewBox="${roundTo(vbX)} ${roundTo(vbY)} ${roundTo(usableWidth)} ${roundTo(usableHeight)}"
            class="tile-svg"
          >
            <!-- Incrustación del SVG completo desplazado con clip -->
            ${fullSvg.substring(fullSvg.indexOf('<defs>'), fullSvg.lastIndexOf('</svg>'))}
          </svg>
        </div>

        <!-- Pie de página con instrucción de impresión -->
        <div class="tile-footer">
          IMPORTANTE: Imprimir al 100% de escala (tamaño real, sin ajustar ni reducir a los bordes de la página).
          Verifique el cuadrado de 100 × 100 mm en la hoja inicial. ${isApproved ? 'Aprobado por Katherine Carroll.' : 'No cortar sin aprobación formal.'}
        </div>
      </div>
      `);
            pageNum++;
        }
    }

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title} — Mosaico de Impresión 1:1</title>
  <style>
    @page {
      size: ${paperSize === 'a4' ? 'A4 portrait' : 'letter portrait'};
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #EFEFEF;
      color: #171411;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .page {
      width: ${paperWidth}mm;
      height: ${paperHeight}mm;
      padding: ${marginMm}mm;
      margin: 10mm auto;
      background: #FFFFFF;
      position: relative;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      page-break-after: always;
      overflow: hidden;
    }
    @media print {
      body { background: transparent; }
      .page {
        margin: 0;
        box-shadow: none;
        page-break-after: always;
      }
      .no-print { display: none !important; }
    }
    .tile-header {
      border-bottom: 1px solid #171411;
      padding-bottom: 4px;
      margin-bottom: 4px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      font-size: 8px;
      letter-spacing: 0.5px;
    }
    .tile-title { font-weight: 700; color: #A78350; }
    .tile-coords { font-weight: 600; color: #171411; }
    .tile-sub { color: #766B62; font-size: 7px; }
    .tile-cert-tag {
      background: #D1E7DD;
      color: #0F5132;
      font-size: 7px;
      padding: 1px 5px;
      border-radius: 2px;
      font-weight: 700;
      margin-left: 6px;
    }
    .tile-draft-tag {
      background: #F8D7DA;
      color: #842029;
      font-size: 7px;
      padding: 1px 5px;
      border-radius: 2px;
      font-weight: 700;
      margin-left: 6px;
    }
    .tile-watermark {
      position: absolute;
      top: 50%;
      left: -10%;
      width: 120%;
      text-align: center;
      font-size: 16px;
      font-weight: 800;
      color: rgba(180, 40, 40, 0.12);
      transform: rotate(-35deg);
      pointer-events: none;
      z-index: 500;
      letter-spacing: 1px;
    }
    .cover-page {
      padding: 12mm 15mm;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }
    .tile-content {
      width: ${roundTo(usableWidth)}mm;
      height: ${roundTo(usableHeight)}mm;
      border: 0.5px dashed #C0B7AC;
      position: relative;
      overflow: hidden;
    }
    .tile-svg {
      display: block;
      width: 100%;
      height: 100%;
    }
    .tile-footer {
      position: absolute;
      bottom: 4mm;
      left: ${marginMm}mm;
      right: ${marginMm}mm;
      font-size: 7px;
      color: #766B62;
      text-align: center;
      border-top: 0.5px solid #E6D9C8;
      padding-top: 2px;
    }
    .corner-cross {
      position: absolute;
      width: 8mm;
      height: 8mm;
      pointer-events: none;
    }
    .corner-cross::before, .corner-cross::after {
      content: '';
      position: absolute;
      background: #171411;
    }
    .corner-cross::before { top: 0; left: 4mm; width: 0.5px; height: 8mm; }
    .corner-cross::after { top: 4mm; left: 0; width: 8mm; height: 0.5px; }
    .cross-tl { top: ${marginMm}mm; left: ${marginMm}mm; }
    .cross-tr { top: ${marginMm}mm; right: ${marginMm}mm; }
    .cross-bl { bottom: ${marginMm}mm; left: ${marginMm}mm; }
    .cross-br { bottom: ${marginMm}mm; right: ${marginMm}mm; }
    .print-bar {
      position: sticky;
      top: 0;
      background: #171411;
      color: #F8F2E9;
      padding: 12px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      z-index: 1000;
    }
    .btn-print {
      background: #A78350;
      color: #FAF7F2;
      border: none;
      padding: 8px 18px;
      font-weight: 600;
      border-radius: 4px;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="print-bar no-print">
    <div>
      <strong>Mosaico de Impresión 1:1 (${totalPages} páginas ${paperSize.toUpperCase()})</strong> — ${title}
    </div>
    <button class="btn-print" onclick="window.print()">Imprimir en Escala 100%</button>
  </div>
  ${pagesHtml.join('\n')}
</body>
</html>`;
}
