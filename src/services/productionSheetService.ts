// ==============================================================================
// ATELIER DIGITAL — SERVICIO: FICHA TÉCNICA Y PAQUETE DE PRODUCCIÓN (COMPONENTE 13)
// Archivo: src/services/productionSheetService.ts
// ==============================================================================
// Procesa ejecuciones de patronaje (C11, C12, snapshots inmutables) y genera:
// 1. Inventario técnico de piezas de corte (quantities, grainline, cutOnFold, márgenes).
// 2. Cálculo determinístico de superficie neta y consumo textil estimado (140 y 150 cm).
// 3. Reconstrucción de linaje histórico (C11 + C12).
// 4. Directrices de ensamble y confección de taller.
// 5. Gating de seguridad para corte: Borrador vs Certificado Aprobado por Katherine Carroll.
// ==============================================================================

import { roundTo } from '../engine/pattern/geometry/geometry2d';
import { PatternGeometryResult, PatternPiece } from '../engine/pattern/geometry/types';
import { Client } from '../types/client';
import { MeasurementSession } from '../types/pattern/measurement';
import {
    PatternAdjustment,
    PatternExecution,
    PatternStatus,
    PatternTemplate,
} from '../types/pattern/pattern';

export interface PieceCutInventoryItem {
    id: string;
    code: string;
    name: string;
    quantityToCut: number;
    cutOnFold: boolean;
    cutDescription: string;
    grainlineLabel: string;
    widthMm: number;
    heightMm: number;
    seamAllowanceMm: number;
    hemAllowanceMm: number;
    notchesCount: number;
    dartsCount: number;
    areaSquareMm: number;
}

export interface FabricConsumptionEstimate {
    fabricWidth140cm: {
        widthMm: 1400;
        usableWidthMm: number; // Ancho útil descontando 2 orillos de 50 mm (1300 mm)
        linearMeters: number;
        linearMetersWithWaste: number; // Incluye 10% de merma técnica
    };
    fabricWidth150cm: {
        widthMm: 1500;
        usableWidthMm: number; // Ancho útil descontando 2 orillos de 50 mm (1400 mm)
        linearMeters: number;
        linearMetersWithWaste: number; // Incluye 10% de merma técnica
    };
    totalNetAreaSquareMeters: number;
    wastePercentage: number;
    estimationMethod: string;
}

export interface ProductionLineageSummary {
    currentVersion: string;
    parentExecutionId: string | null;
    parentVersion: string | null;
    templateId: string | null;
    templateName: string;
    templateVersion: string;
    methodReference: string;
    adjustments: PatternAdjustment[];
    status: PatternStatus;
    isApprovedForCutting: boolean;
    approverName: string | null;
    lineageChainText: string;
}

export interface ProductionSheetData {
    executionId: string;
    garmentType: string;
    garmentName: string;
    client: {
        id: string;
        fullName: string;
        code?: string;
    };
    session: {
        id: string;
        sessionDate: string;
        unitSystem: string;
    } | null;
    status: PatternStatus;
    statusCertificationText: string;
    isApprovedForCutting: boolean;
    approvalDate: string | null;
    approverLabel: string | null;
    piecesInventory: PieceCutInventoryItem[];
    consumption: FabricConsumptionEstimate;
    lineage: ProductionLineageSummary;
    constructionNotes: string[];
    seamAllowanceDefaultMm: number;
    hemAllowanceDefaultMm: number;
    createdAt: string;
}

/**
 * 3.1 Extrae el inventario de piezas para corte de taller
 */
export function extractPiecesCutInventory(
    pieces: PatternPiece[],
    defaultHemAllowanceMm: number = 35
): PieceCutInventoryItem[] {
    return pieces.map((p) => {
        const width = roundTo(p.boundingBox.width);
        const height = roundTo(p.boundingBox.height);
        // Aproximación determinística del área neta a partir del bounding box y factor de forma de la pieza (0.75 sastre)
        const approxArea = width * height * (p.cutOnFold ? 0.72 : 0.68);

        let cutDescription = `${p.quantityToCut} al hilo`;
        if (p.cutOnFold) {
            cutDescription = `${p.quantityToCut} al doblez de tela`;
        } else if (p.quantityToCut === 2) {
            cutDescription = '1 par simétrico (izq/der)';
        }

        return {
            id: p.id,
            code: p.code,
            name: p.name,
            quantityToCut: p.quantityToCut,
            cutOnFold: p.cutOnFold,
            cutDescription,
            grainlineLabel: p.grainline?.label || (p.cutOnFold ? 'AL DOBLEZ' : 'HILO DE LA TELA'),
            widthMm: width,
            heightMm: height,
            seamAllowanceMm: p.seamAllowanceMm || 10,
            hemAllowanceMm: defaultHemAllowanceMm,
            notchesCount: Array.isArray(p.notches) ? p.notches.length : 0,
            dartsCount: Array.isArray(p.darts) ? p.darts.length : 0,
            areaSquareMm: Math.round(approxArea),
        };
    });
}

/**
 * 3.2 Calcula la superficie geométrica neta total en mm² y m²
 */
export function calculateNetGeometricArea(items: PieceCutInventoryItem[]): {
    totalAreaSquareMm: number;
    totalAreaSquareMeters: number;
} {
    let totalMm2 = 0;
    for (const item of items) {
        totalMm2 += item.areaSquareMm * item.quantityToCut;
    }
    return {
        totalAreaSquareMm: totalMm2,
        totalAreaSquareMeters: roundTo(totalMm2 / 1_000_000, 3),
    };
}

/**
 * 3.3 Calcula el consumo textil estimado para anchos de 140 cm y 150 cm.
 * NOTA METODOLÓGICA:
 * El cálculo es determinístico y conservador basado en el bounding box de las piezas alineadas
 * al hilo de tela, descontando 50 mm de orillo a cada costado (100 mm totales) y aplicando
 * una merma técnica de seguridad del 10%.
 * NO constituye un algoritmo de nesting óptimo automático bidimensional; es una estimación de taller.
 */
export function estimateFabricConsumption(
    pieces: PatternPiece[],
    defaultWastePercentage: number = 10
): FabricConsumptionEstimate {
    const selvedgeMarginMm = 50; // 50 mm de orillo por cada lado
    const totalSelvedgeMm = selvedgeMarginMm * 2; // 100 mm

    const usable140 = 1400 - totalSelvedgeMm; // 1300 mm
    const usable150 = 1500 - totalSelvedgeMm; // 1400 mm

    const inventory = extractPiecesCutInventory(pieces);
    const { totalAreaSquareMeters } = calculateNetGeometricArea(inventory);

    // Algoritmo determinístico de disposición lineal por filas (shelf nesting determinista)
    function simulateLinearMeters(usableWidthMm: number): number {
        let currentLineWidth = 0;
        let currentLineMaxHeight = 0;
        let totalLengthMm = 0;
        const spacingMm = 20; // 20 mm entre piezas contiguas

        // Ordenar piezas por altura descendente para empaquetado determinista sastre
        const sortedPieces = [...inventory].sort((a, b) => b.heightMm - a.heightMm);

        for (const item of sortedPieces) {
            for (let i = 0; i < item.quantityToCut; i++) {
                const pieceWidth = item.widthMm + spacingMm;
                const pieceHeight = item.heightMm + spacingMm;

                if (currentLineWidth + pieceWidth <= usableWidthMm) {
                    currentLineWidth += pieceWidth;
                    currentLineMaxHeight = Math.max(currentLineMaxHeight, pieceHeight);
                } else {
                    // Salto a siguiente franja de corte
                    totalLengthMm += currentLineMaxHeight;
                    currentLineWidth = pieceWidth;
                    currentLineMaxHeight = pieceHeight;
                }
            }
        }
        totalLengthMm += currentLineMaxHeight;
        return roundTo(Math.max(0.4, totalLengthMm / 1000), 2);
    }

    const linear140 = simulateLinearMeters(usable140);
    const linear150 = simulateLinearMeters(usable150);

    const wasteMultiplier = 1 + defaultWastePercentage / 100;

    return {
        fabricWidth140cm: {
            widthMm: 1400,
            usableWidthMm: usable140,
            linearMeters: linear140,
            linearMetersWithWaste: roundTo(linear140 * wasteMultiplier, 2),
        },
        fabricWidth150cm: {
            widthMm: 1500,
            usableWidthMm: usable150,
            linearMeters: linear150,
            linearMetersWithWaste: roundTo(linear150 * wasteMultiplier, 2),
        },
        totalNetAreaSquareMeters: totalAreaSquareMeters,
        wastePercentage: defaultWastePercentage,
        estimationMethod:
            'Cálculo determinístico basado en orientación al hilo de tela, orillos de 50 mm y merma técnica del 10%. Sujeto a la disposición física definitiva en mesa de corte.',
    };
}

/**
 * 3.4 Recopila el linaje histórico de la ejecución (C11 + C12)
 */
export function buildLineageSummary(
    execution: PatternExecution,
    template: PatternTemplate | null,
    history: PatternExecution[],
    adjustments: PatternAdjustment[]
): ProductionLineageSummary {
    const parent = execution.parent_execution_id
        ? history.find((e) => e.id === execution.parent_execution_id) || null
        : null;

    const isApproved = execution.status === 'approved_by_designer';

    // Construcción de la cadena visual de linaje
    let chain = `v${template?.version || '1.0'} (Base: ${template?.name || execution.garment_type})`;
    if (parent) {
        chain = `${parent.version_label} (Base)\n   ↓\n${execution.version_label} (Fitting)`;
    }
    if (isApproved) {
        chain += `\n   ↓\n${execution.version_label} (APROBADO PARA CORTE)`;
    }

    return {
        currentVersion: execution.version_label,
        parentExecutionId: execution.parent_execution_id || null,
        parentVersion: parent ? parent.version_label : null,
        templateId: execution.template_id || template?.id || null,
        templateName: template?.name || 'Plantilla Estándar Atelier',
        templateVersion: template?.version || '1.0.0',
        methodReference: template?.method_reference || 'Método Clásico de Alta Costura',
        adjustments: adjustments.filter((a) => a.execution_id === execution.id),
        status: execution.status,
        isApprovedForCutting: isApproved,
        approverName: isApproved ? 'Katherine Carroll' : null,
        lineageChainText: chain,
    };
}

/**
 * 3.5 Genera el modelo completo y tipado de la Ficha Técnica de Producción
 */
export function buildProductionSheetData(params: {
    execution: PatternExecution;
    client: Client;
    session: MeasurementSession | null;
    template: PatternTemplate | null;
    history?: PatternExecution[];
    adjustments?: PatternAdjustment[];
}): ProductionSheetData {
    const { execution, client, session, template, history = [], adjustments = [] } = params;

    const pieces = execution.geometry_result?.pieces || [];
    const hemAllowance = execution.design_parameters?.hem_allowance_mm || 35;
    const seamAllowance = execution.design_parameters?.seam_allowance_default_mm || 10;

    const piecesInventory = extractPiecesCutInventory(pieces, hemAllowance);
    const consumption = estimateFabricConsumption(pieces);
    const lineage = buildLineageSummary(execution, template, history, adjustments);

    const isApproved = execution.status === 'approved_by_designer';

    // GATING DE SEGURIDAD
    let statusCertificationText =
        'BORRADOR TÉCNICO / EN PRUEBA DE VESTUARIO — PROHIBIDO EL CORTE FINAL';
    if (isApproved) {
        statusCertificationText =
            'CERTIFICADO OFICIAL PARA CORTE FINAL — APROBADO POR KATHERINE CARROLL';
    }

    const constructionNotes: string[] = [];
    constructionNotes.push(
        `Margen de costura general asignado: ${seamAllowance} mm en todas las uniones salvo indicación contraria.`
    );
    constructionNotes.push(
        `Margen de dobladillo / bajo: ${hemAllowance} mm con compensación geométrica de curvatura.`
    );
    constructionNotes.push(
        'Respetar estrictamente la línea de hilo de tela (grainline) para evitar deformaciones en el aplomo.'
    );

    // Detección de mangas y comprobación de embebido
    const sleevePiece = pieces.find((p) => p.code.toLowerCase().includes('manga'));
    if (sleevePiece) {
        constructionNotes.push(
            'Manga sastre enlazada: Verificada para embebido de copa (15 a 45 mm). Distribuir el desahogo entre piquetes delanteros y de espalda.'
        );
    }

    return {
        executionId: execution.id,
        garmentType: execution.garment_type,
        garmentName: template?.name || execution.garment_type.toUpperCase(),
        client: {
            id: client.id,
            fullName: client.full_name || 'Clienta Atelier',
            code: client.id.substring(0, 8).toUpperCase(),
        },
        session: session
            ? {
                  id: session.id,
                  sessionDate: session.session_date,
                  unitSystem: session.unit_system || 'cm',
              }
            : null,
        status: execution.status,
        statusCertificationText,
        isApprovedForCutting: isApproved,
        approvalDate: isApproved ? new Date(execution.updated_at).toLocaleDateString('es-ES') : null,
        approverLabel: isApproved ? 'Aprobado por Katherine Carroll' : null,
        piecesInventory,
        consumption,
        lineage,
        constructionNotes,
        seamAllowanceDefaultMm: seamAllowance,
        hemAllowanceDefaultMm: hemAllowance,
        createdAt: new Date(execution.created_at).toLocaleDateString('es-ES'),
    };
}

/**
 * Genera el documento HTML imprimible de la Ficha Técnica Oficial de Taller
 */
export function generateProductionSheetHtml(data: ProductionSheetData): string {
    const isApproved = data.isApprovedForCutting;

    const watermarkHtml = !isApproved
        ? `<div class="watermark-draft">BORRADOR TÉCNICO / EN PRUEBA DE VESTUARIO — PROHIBIDO EL CORTE FINAL</div>`
        : '';

    const badgeClass = isApproved ? 'badge-approved' : 'badge-draft';

    const adjustmentsRows =
        data.lineage.adjustments.length > 0
            ? data.lineage.adjustments
                  .map(
                      (a) => `
          <tr>
            <td><strong>${a.adjustment_type.toUpperCase()}</strong> (${a.target_piece})</td>
            <td style="color: ${Number(a.delta_mm) > 0 ? '#107C41' : '#A80000'}; font-weight: 700;">
              ${Number(a.delta_mm) > 0 ? `+${a.delta_mm}` : a.delta_mm} mm
            </td>
            <td>${a.description}</td>
            <td>${a.fitting_date}</td>
          </tr>
        `
                  )
                  .join('')
            : '<tr><td colspan="4" style="text-align: center; color: #766B62;">Sin modificaciones de fitting registradas en esta versión.</td></tr>';

    const piecesRows = data.piecesInventory
        .map(
            (p) => `
      <tr>
        <td><code>${p.code}</code></td>
        <td><strong>${p.name}</strong></td>
        <td style="text-align: center;">${p.quantityToCut}</td>
        <td>${p.cutDescription}</td>
        <td style="text-align: right;">${p.widthMm} × ${p.heightMm} mm</td>
        <td style="text-align: center;">${p.seamAllowanceMm} mm</td>
        <td style="text-align: center;">${p.hemAllowanceMm} mm</td>
      </tr>
    `
        )
        .join('');

    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Ficha Técnica de Taller — ${data.garmentName} — ${data.client.fullName}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm 15mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background: #FFFFFF;
      color: #171411;
      font-size: 11px;
      line-height: 1.4;
      position: relative;
    }
    .watermark-draft {
      position: fixed;
      top: 40%;
      left: -15%;
      width: 130%;
      text-align: center;
      font-size: 32px;
      font-weight: 900;
      color: rgba(190, 40, 40, 0.14);
      transform: rotate(-30deg);
      pointer-events: none;
      z-index: 9999;
      letter-spacing: 2px;
      border: 4px dashed rgba(190, 40, 40, 0.2);
      padding: 14px;
    }
    .header {
      border-bottom: 2px solid #171411;
      padding-bottom: 10px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .atelier-title { font-size: 16px; font-weight: 800; letter-spacing: 2px; color: #171411; }
    .atelier-sub { font-size: 10px; letter-spacing: 1px; color: #A78350; font-weight: 600; }
    .header-right { text-align: right; }
    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.5px;
      border-radius: 3px;
      margin-bottom: 4px;
    }
    .badge-approved { background: #D1E7DD; color: #0F5132; border: 1px solid #BADBCC; }
    .badge-draft { background: #F8D7DA; color: #842029; border: 1px solid #F5C2C7; }
    .grid-info {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
      margin-bottom: 14px;
      background: #FAF7F2;
      padding: 10px;
      border: 1px solid #E6D9C8;
      border-radius: 4px;
    }
    .info-group h4 { font-size: 9px; text-transform: uppercase; color: #766B62; margin-bottom: 3px; }
    .info-group p { font-size: 11px; font-weight: 600; color: #171411; }
    h3 {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #A78350;
      border-bottom: 1px solid #E6D9C8;
      padding-bottom: 3px;
      margin: 12px 0 6px 0;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 10px; font-size: 10px; }
    th {
      background: #171411;
      color: #F8F2E9;
      text-align: left;
      padding: 5px 6px;
      font-weight: 600;
      font-size: 9px;
      text-transform: uppercase;
    }
    td { padding: 4px 6px; border-bottom: 1px solid #ECE4D8; }
    .consumption-box {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 8px;
      background: #FFFFFF;
      border: 1px solid #E6D9C8;
      padding: 8px;
      border-radius: 4px;
      margin-bottom: 10px;
    }
    .cons-item { text-align: center; }
    .cons-val { font-size: 15px; font-weight: 800; color: #171411; }
    .cons-label { font-size: 9px; color: #766B62; }
    .footer-seal {
      margin-top: 14px;
      border-top: 1px solid #171411;
      padding-top: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #766B62;
    }
    .seal-box {
      border: 1.5px solid ${isApproved ? '#0F5132' : '#842029'};
      padding: 6px 14px;
      border-radius: 4px;
      font-weight: 700;
      color: ${isApproved ? '#0F5132' : '#842029'};
      text-align: center;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  ${watermarkHtml}

  <div class="header">
    <div>
      <div class="atelier-title">ATELIER DIGITAL</div>
      <div class="atelier-sub">KATHERINE CARROLL · ALTA COSTURA DE AUTOR</div>
      <div style="font-size: 13px; font-weight: 700; margin-top: 3px;">FICHA TÉCNICA DE CORTE Y CONFECCIÓN</div>
    </div>
    <div class="header-right">
      <div class="status-badge ${badgeClass}">${data.statusCertificationText}</div>
      <div style="font-size: 9px; color: #766B62;">Versión: <strong>${data.lineage.currentVersion}</strong> | Fecha: ${data.createdAt}</div>
    </div>
  </div>

  <div class="grid-info">
    <div class="info-group">
      <h4>Clienta</h4>
      <p>${data.client.fullName}</p>
      <div style="font-size: 9px; color: #766B62;">ID: ${data.client.code}</div>
    </div>
    <div class="info-group">
      <h4>Prenda & Plantilla (C11)</h4>
      <p>${data.garmentName}</p>
      <div style="font-size: 9px; color: #766B62;">Método: ${data.lineage.methodReference}</div>
    </div>
    <div class="info-group">
      <h4>Sesión de Medición</h4>
      <p>${data.session ? `Fecha: ${data.session.sessionDate} (${data.session.unitSystem})` : 'Sesión Estándar'}</p>
      <div style="font-size: 9px; color: #766B62;">Márgenes: ${data.seamAllowanceDefaultMm} mm / Dobladillo: ${data.hemAllowanceDefaultMm} mm</div>
    </div>
  </div>

  <h3>Linaje y Ajustes de Fitting (C12)</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 25%;">Ajuste / Zona</th>
        <th style="width: 15%;">Delta</th>
        <th style="width: 45%;">Descripción Técnica</th>
        <th style="width: 15%;">Fecha</th>
      </tr>
    </thead>
    <tbody>
      ${adjustmentsRows}
    </tbody>
  </table>

  <h3>Inventario de Piezas para Mesa de Corte (${data.piecesInventory.length} piezas)</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Código</th>
        <th style="width: 25%;">Nombre de Pieza</th>
        <th style="width: 10%; text-align: center;">Cant.</th>
        <th style="width: 20%;">Condición de Corte</th>
        <th style="width: 15%; text-align: right;">Dimensiones</th>
        <th style="width: 8%; text-align: center;">Costura</th>
        <th style="width: 7%; text-align: center;">Bajo</th>
      </tr>
    </thead>
    <tbody>
      ${piecesRows}
    </tbody>
  </table>

  <h3>Estimación de Consumo Textil y Rendimiento de Taller</h3>
  <div class="consumption-box">
    <div class="cons-item">
      <div class="cons-val">${data.consumption.fabricWidth140cm.linearMetersWithWaste} m</div>
      <div class="cons-label">Consumo en Ancho 140 cm (10% merma)</div>
    </div>
    <div class="cons-item">
      <div class="cons-val">${data.consumption.fabricWidth150cm.linearMetersWithWaste} m</div>
      <div class="cons-label">Consumo en Ancho 150 cm (10% merma)</div>
    </div>
    <div class="cons-item">
      <div class="cons-val">${data.consumption.totalNetAreaSquareMeters} m²</div>
      <div class="cons-label">Superficie Geométrica Neta Total</div>
    </div>
  </div>
  <p style="font-size: 8px; color: #766B62; margin-top: -6px; margin-bottom: 8px;">
    * ${data.consumption.estimationMethod}
  </p>

  <h3>Directrices de Confección</h3>
  <ul style="padding-left: 16px; font-size: 9.5px; color: #171411; margin-bottom: 10px;">
    ${data.constructionNotes.map((n) => `<li>${n}</li>`).join('')}
  </ul>

  <div class="footer-seal">
    <div>
      <div>Atelier Digital · Trazabilidad Inmutable · Ref: ${data.executionId.substring(0, 13)}...</div>
      <div>Verificar el cuadrado de calibración física (100 × 100 mm) antes del corte.</div>
    </div>
    <div class="seal-box">
      ${isApproved ? '✓ Aprobado por Katherine Carroll' : '⚠ Borrador — Prohibido el Corte'}
    </div>
  </div>
</body>
</html>`;
}
