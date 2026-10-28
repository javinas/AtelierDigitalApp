// ==============================================================================
// ATELIER DIGITAL — EXPORTADOR SVG A ESCALA REAL 1:1 (M02.12)
// Archivo: src/engine/pattern/export/svgExporter.ts
// ==============================================================================
// Exporta patrones en formato SVG con unidades físicas en milímetros (mm),
// diferenciando contornos de costura y corte, hilo, piquetes, pinzas y
// cuadrado de calibración obligatorio de 100 x 100 mm.
// ==============================================================================

import { pathToSvgD, roundTo } from '../geometry/geometry2d';
import { PatternGeometryResult, PatternPiece } from '../geometry/types';
import { PatternStatus } from '../../../types/pattern/pattern';

export interface SvgExportOptions {
    includeCalibrationSquare?: boolean;
    includeSeamLine?: boolean;
    includeCutLine?: boolean;
    includeGrainlines?: boolean;
    includeNotches?: boolean;
    includeLabels?: boolean;
    marginMm?: number;
    title?: string;
    status?: PatternStatus;
    clientName?: string;
    versionLabel?: string;
    templateName?: string;
}

export function exportPatternToSvg(
    geometry: PatternGeometryResult,
    options: SvgExportOptions = {}
): string {
    const {
        includeCalibrationSquare = true,
        includeSeamLine = true,
        includeCutLine = true,
        includeGrainlines = true,
        includeNotches = true,
        includeLabels = true,
        marginMm = 40,
        title = 'Atelier Digital — Patrón Paramétrico de Alta Costura',
        status,
        clientName = 'Clienta',
        versionLabel = 'v1.0',
        templateName = 'Patrón Base',
    } = options;

    const isApproved = status === 'approved_by_designer';

    const bBox = geometry.boundingBox;
    // Espacio adicional para el cuadrado de calibración si se incluye
    const calibSize = includeCalibrationSquare ? 120 : 0;
    const totalWidth = Math.max(bBox.width + marginMm * 2, calibSize + marginMm * 2);
    const totalHeight = bBox.height + marginMm * 2 + (includeCalibrationSquare ? 140 : 0);

    const svgParts: string[] = [];

    // Header SVG con dimensiones físicas y viewBox
    svgParts.push(
        `<svg xmlns="http://www.w3.org/2000/svg" ` +
        `width="${roundTo(totalWidth)}mm" ` +
        `height="${roundTo(totalHeight)}mm" ` +
        `viewBox="0 0 ${roundTo(totalWidth)} ${roundTo(totalHeight)}" ` +
        `version="1.1">`
    );

    // Metadatos y estilos CSS
    svgParts.push(`
  <metadata>
    <title>${title}</title>
    <creator>Atelier Digital — By Katherine Carroll</creator>
    <client>${clientName}</client>
    <version>${versionLabel}</version>
    <template>${templateName}</template>
    <status>${status || 'draft'}</status>
    <date>${new Date().toISOString()}</date>
    <engineVersion>${geometry.engineVersion}</engineVersion>
  </metadata>
  <defs>
    <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="#171411" />
    </marker>
    <style>
      .cut-line { fill: none; stroke: #171411; stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; }
      .seam-line { fill: none; stroke: #A78350; stroke-width: 0.8; stroke-dasharray: 4 3; }
      .grainline { stroke: #171411; stroke-width: 1.0; marker-start: url(#arrow); marker-end: url(#arrow); }
      .notch { stroke: #9E3B3B; stroke-width: 1.5; stroke-linecap: square; }
      .dart-line { stroke: #766B62; stroke-width: 0.8; stroke-dasharray: 2 2; fill: none; }
      .label-title { font-family: 'Montserrat', sans-serif; font-size: 11px; font-weight: 700; fill: #171411; }
      .label-sub { font-family: 'Montserrat', sans-serif; font-size: 8px; fill: #766B62; }
      .calib-box { fill: #FAF7F2; stroke: #171411; stroke-width: 1.0; }
      .calib-text { font-family: 'Montserrat', sans-serif; font-size: 9px; fill: #171411; text-anchor: middle; font-weight: 600; }
      .watermark-draft { font-family: sans-serif; font-size: 42px; font-weight: 900; fill: rgba(180, 40, 40, 0.12); text-anchor: middle; letter-spacing: 2px; }
      .cert-seal-rect { fill: #FAF7F2; stroke: #0F5132; stroke-width: 1.5; }
      .cert-seal-title { font-family: 'Montserrat', sans-serif; font-size: 10px; font-weight: 800; fill: #0F5132; text-anchor: middle; letter-spacing: 1px; }
      .cert-seal-sub { font-family: 'Montserrat', sans-serif; font-size: 8px; font-weight: 600; fill: #171411; text-anchor: middle; }
    </style>
  </defs>
`);

    // Cuadrado de calibración obligatorio de 100 x 100 mm
    if (includeCalibrationSquare) {
        const calX = marginMm;
        const calY = marginMm;
        svgParts.push(`
  <!-- CUADRADO DE CALIBRACIÓN OBLIGATORIO (100 x 100 mm) -->
  <g id="calibration-square">
    <rect x="${calX}" y="${calY}" width="100" height="100" class="calib-box" />
    <line x1="${calX}" y1="${calY + 50}" x2="${calX + 100}" y2="${calY + 50}" stroke="#E6D9C8" stroke-width="0.5" />
    <line x1="${calX + 50}" y1="${calY}" x2="${calX + 50}" y2="${calY + 100}" stroke="#E6D9C8" stroke-width="0.5" />
    <text x="${calX + 50}" y="${calY + 45}" class="calib-text">CUADRADO DE CALIBRACIÓN</text>
    <text x="${calX + 50}" y="${calY + 60}" class="calib-text">100 × 100 mm</text>
    <text x="${calX + 50}" y="${calY + 75}" style="font-size: 7px; fill: #766B62; text-anchor: middle;">Verificar con regla (Escala 100%)</text>
  </g>
`);
    }

    // Sello de Certificación o Marca de Agua según estado
    if (isApproved) {
        const sealX = marginMm + 130;
        const sealY = marginMm;
        svgParts.push(`
  <!-- SELLO DE CERTIFICACIÓN DE CORTE FINAL -->
  <g id="production-certification-seal">
    <rect x="${sealX}" y="${sealY}" width="280" height="70" rx="4" class="cert-seal-rect" />
    <text x="${sealX + 140}" y="${sealY + 28}" class="cert-seal-title">CERTIFICADO OFICIAL PARA CORTE FINAL</text>
    <text x="${sealX + 140}" y="${sealY + 48}" class="cert-seal-sub">Aprobado por Katherine Carroll · Atelier Digital</text>
  </g>
`);
    } else {
        const midSvgX = totalWidth / 2;
        const midSvgY = totalHeight / 2;
        svgParts.push(`
  <!-- MARCA DE AGUA CONDICIONAL PARA PATRONES NO APROBADOS -->
  <g id="draft-watermark" pointer-events="none">
    <text x="${roundTo(midSvgX)}" y="${roundTo(midSvgY)}" class="watermark-draft" transform="rotate(-25, ${roundTo(midSvgX)}, ${roundTo(midSvgY)})">
      BORRADOR TÉCNICO / EN PRUEBA DE VESTUARIO — PROHIBIDO EL CORTE FINAL
    </text>
  </g>
`);
    }

    // Desplazamiento base para las piezas
    const pieceOffsetY = marginMm + (includeCalibrationSquare ? 130 : 0);
    const pieceOffsetX = marginMm;

    // Renderizar cada pieza
    for (const piece of geometry.pieces) {
        svgParts.push(`  <g id="piece-${piece.code}">`);

        // 1. Línea de corte (con margen)
        if (includeCutLine) {
            const cutD = pathToSvgD(piece.outlineCut);
            svgParts.push(`    <path d="${cutD}" transform="translate(${pieceOffsetX}, ${pieceOffsetY})" class="cut-line" />`);
        }

        // 2. Línea de costura neta
        if (includeSeamLine) {
            const seamD = pathToSvgD(piece.outlineSeam);
            svgParts.push(`    <path d="${seamD}" transform="translate(${pieceOffsetX}, ${pieceOffsetY})" class="seam-line" />`);
        }

        // 3. Pinzas
        for (const dart of piece.darts) {
            svgParts.push(
                `    <line x1="${dart.leftBase.x + pieceOffsetX}" y1="${dart.leftBase.y + pieceOffsetY}" ` +
                `x2="${dart.apex.x + pieceOffsetX}" y2="${dart.apex.y + pieceOffsetY}" class="dart-line" />`
            );
            svgParts.push(
                `    <line x1="${dart.rightBase.x + pieceOffsetX}" y1="${dart.rightBase.y + pieceOffsetY}" ` +
                `x2="${dart.apex.x + pieceOffsetX}" y2="${dart.apex.y + pieceOffsetY}" class="dart-line" />`
            );
        }

        // 4. Hilo de la tela / aplomo
        if (includeGrainlines) {
            const g = piece.grainline;
            svgParts.push(
                `    <line x1="${g.start.x + pieceOffsetX}" y1="${g.start.y + pieceOffsetY}" ` +
                `x2="${g.end.x + pieceOffsetX}" y2="${g.end.y + pieceOffsetY}" class="grainline" />`
            );
            const midX = (g.start.x + g.end.x) / 2.0 + pieceOffsetX + 6;
            const midY = (g.start.y + g.end.y) / 2.0 + pieceOffsetY;
            svgParts.push(
                `    <text x="${midX}" y="${midY}" class="label-sub" transform="rotate(90, ${midX}, ${midY})">${g.label}</text>`
            );
        }

        // 5. Piquetes
        if (includeNotches) {
            for (const notch of piece.notches) {
                const nx1 = notch.position.x + pieceOffsetX;
                const ny1 = notch.position.y + pieceOffsetY;
                const nx2 = nx1 + Math.cos(notch.angleRad) * notch.lengthMm;
                const ny2 = ny1 + Math.sin(notch.angleRad) * notch.lengthMm;
                svgParts.push(`    <line x1="${nx1}" y1="${ny1}" x2="${nx2}" y2="${ny2}" class="notch" />`);
            }
        }

        // 6. Etiquetas de pieza
        if (includeLabels) {
            for (let i = 0; i < piece.labels.length; i++) {
                const label = piece.labels[i];
                const lx = label.position.x + pieceOffsetX;
                const ly = label.position.y + pieceOffsetY;
                const cssClass = i === 0 ? 'label-title' : 'label-sub';
                svgParts.push(`    <text x="${lx}" y="${ly}" class="${cssClass}">${label.text}</text>`);
            }
        }

        svgParts.push(`  </g>`);
    }

    svgParts.push(`</svg>`);
    return svgParts.join('\n');
}
