import { Client } from '../types/client';
import { MeasuredPerson } from '../types/personGroup';
import { MeasurementSession } from '../types/pattern/measurement';
import { MASTER_MEASUREMENT_CATALOG } from '../engine/pattern/catalog/masterCatalog';

export function printA4MeasurementSheet(
    client: Client,
    person: MeasuredPerson | null,
    session: MeasurementSession
) {
    if (typeof window === 'undefined') return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const unit = session.unit_system || 'cm';
    const values = session.values || {};
    const personName = person ? person.full_name : `${client.full_name} (Titular)`;
    const refText = person?.reference_id ? ` · Ref: ${person.reference_id}` : '';
    const dateFormatted = session.session_date || new Date().toISOString().split('T')[0];

    // Agrupar medidas por categoría
    const categories: Record<string, { label: string; items: any[] }> = {
        torso_body: { label: 'TORSO Y BUSTO', items: [] },
        arms_sleeves: { label: 'BRAZOS Y MANGAS', items: [] },
        legs_pants: { label: 'PIERNAS Y CINTURA', items: [] },
        fit_adjustment: { label: 'AJUSTE Y HOLGURAS', items: [] },
        garment_design: { label: 'DISEÑO DE PRENDA', items: [] },
    };

    MASTER_MEASUREMENT_CATALOG.forEach((catItem) => {
        const valItem = values[catItem.code];
        const valMm = valItem?.value_mm;
        const isFilled = typeof valMm === 'number' && valMm > 0;
        let displayVal = '—';
        if (isFilled) {
            displayVal = unit === 'in' ? `${(valMm / 25.4).toFixed(2)} in` : `${(valMm / 10).toFixed(1)} cm`;
        }

        const targetCat = categories[catItem.category] || categories.torso_body;
        targetCat.items.push({
            name: catItem.name,
            code: catItem.code,
            value: displayVal,
            isFilled,
            side: valItem?.side && valItem.side !== 'none' ? (valItem.side === 'left' ? 'Izq' : 'Der') : '',
        });
    });

    const htmlContent = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Ficha A4 - ${personName} - Atelier Katherine Carroll</title>
    <style>
        @page {
            size: portrait;
            margin: 8mm 10mm;
        }
        * {
            box-sizing: border-box;
        }
        html, body {
            height: 100%;
            margin: 0;
            padding: 0;
            background: #fff;
            color: #171411;
            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
            font-size: 9.5px;
            line-height: 1.3;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }
        .page-container {
            width: 100%;
            max-width: 195mm;
            min-height: calc(100vh - 16mm);
            margin: 0 auto;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            page-break-inside: avoid;
            page-break-after: avoid;
        }
        .header {
            border-bottom: 2px solid #A78350;
            padding-bottom: 6px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
        }
        .brand-title {
            font-family: 'Playfair Display', Georgia, serif;
            font-size: 20px;
            font-weight: 700;
            color: #171411;
            letter-spacing: 1px;
            text-transform: uppercase;
            line-height: 1.1;
        }
        .brand-sub {
            font-size: 9px;
            color: #8A6A4A;
            letter-spacing: 1.8px;
            text-transform: uppercase;
            font-weight: 600;
            margin-top: 3px;
        }
        .sheet-badge {
            font-size: 8.5px;
            font-weight: 700;
            color: #A78350;
            border: 1.5px solid #A78350;
            padding: 3px 8px;
            border-radius: 3px;
            text-transform: uppercase;
            letter-spacing: 1px;
        }
        .meta-grid {
            display: grid;
            grid-template-columns: 2fr 1.2fr 1fr;
            gap: 8px;
            background: #F8F2E9;
            border: 1px solid #E6D9C8;
            border-radius: 4px;
            padding: 6px 12px;
            margin-bottom: 8px;
        }
        .meta-item {
            display: flex;
            flex-direction: column;
        }
        .meta-label {
            font-size: 7.5px;
            color: #766B62;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            font-weight: 700;
            margin-bottom: 2px;
        }
        .meta-val {
            font-size: 11px;
            font-weight: 700;
            color: #171411;
        }
        .categories-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 8px;
            flex: 1;
        }
        .cat-box {
            border: 1px solid #E6D9C8;
            border-radius: 4px;
            overflow: hidden;
            margin-bottom: 6px;
            page-break-inside: avoid;
            background: #fff;
        }
        .cat-title {
            background: #F8F2E9;
            color: #8A6A4A;
            font-size: 9px;
            font-weight: 700;
            letter-spacing: 0.8px;
            padding: 4px 8px;
            border-bottom: 1px solid #E6D9C8;
            text-transform: uppercase;
        }
        .meas-table {
            width: 100%;
            border-collapse: collapse;
        }
        .meas-table tr:nth-child(even) {
            background: #FCFAF7;
        }
        .meas-table td {
            padding: 2.8px 8px;
            font-size: 9px;
            border-bottom: 0.5px solid #F0ECE6;
            line-height: 1.25;
        }
        .meas-name {
            color: #333;
        }
        .meas-val {
            text-align: right;
            font-weight: 700;
            color: #171411;
        }
        .meas-side {
            font-size: 7.5px;
            color: #A78350;
            margin-left: 4px;
            font-weight: bold;
        }
        .notes-box {
            border: 1px dashed #A78350;
            border-radius: 4px;
            padding: 6px 12px;
            background: #FFFDF9;
            margin-top: 6px;
            page-break-inside: avoid;
        }
        .notes-label {
            font-size: 7.5px;
            font-weight: 700;
            color: #8A6A4A;
            letter-spacing: 0.8px;
            text-transform: uppercase;
        }
        .notes-text {
            font-size: 9px;
            font-style: italic;
            color: #444;
            margin-top: 2px;
            line-height: 1.3;
        }
        .footer-signatures {
            margin-top: 14px;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            padding-top: 6px;
            page-break-inside: avoid;
        }
        .sig-box {
            border-top: 1.5px solid #766B62;
            padding-top: 5px;
            text-align: center;
            font-size: 8px;
            color: #766B62;
            text-transform: uppercase;
            letter-spacing: 1px;
            font-weight: 600;
        }
        @media print {
            .no-print { display: none; }
            html, body {
                width: 100%;
                height: 100%;
                overflow: hidden;
            }
            .page-container {
                min-height: 258mm;
            }
        }
    </style>
</head>
<body>
    <div class="page-container">
        <div class="header">
            <div>
                <div class="brand-title">Atelier de Autor</div>
                <div class="brand-sub">By Katherine Carroll · Alta Costura</div>
            </div>
            <div class="sheet-badge">Ficha Técnica Antropométrica</div>
        </div>

        <div class="meta-grid">
            <div class="meta-item">
                <span class="meta-label">Sujeto Anatómico Medido</span>
                <span class="meta-val">${personName}${refText}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Cliente / Responsable</span>
                <span class="meta-val">${client.full_name}</span>
            </div>
            <div class="meta-item">
                <span class="meta-label">Sesión & Versión</span>
                <span class="meta-val">v${session.version_number || 1} · ${dateFormatted} (${unit.toUpperCase()})</span>
            </div>
        </div>

        <div class="categories-grid">
            ${Object.values(categories)
                .filter((c) => c.items.length > 0)
                .map(
                    (c) => `
                <div class="cat-box">
                    <div class="cat-title">${c.label}</div>
                    <table class="meas-table">
                        ${c.items
                            .map(
                                (it) => `
                            <tr>
                                <td class="meas-name">${it.name}${it.side ? `<span class="meas-side">(${it.side})</span>` : ''}</td>
                                <td class="meas-val">${it.value}</td>
                            </tr>
                        `
                            )
                            .join('')}
                    </table>
                </div>
            `
                )
                .join('')}
        </div>

        ${
            session.notes
                ? `
        <div class="notes-box">
            <div class="notes-label">Observaciones y Notas de Toma:</div>
            <div class="notes-text">“${session.notes}”</div>
        </div>
        `
                : ''
        }

        <div class="footer-signatures">
            <div class="sig-box">Firma Patronista / Modista</div>
            <div class="sig-box">V.B. Katherine Carroll · Atelier</div>
        </div>
    </div>

    <script>
        window.onload = function() {
            window.print();
        };
    </script>
</body>
</html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
}

