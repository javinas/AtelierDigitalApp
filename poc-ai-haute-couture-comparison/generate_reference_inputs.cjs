/* global __dirname */
// ==============================================================================
// POC COMPARATIVA AI HAUTE COUTURE — GENERADOR DE REFERENCIAS Y AUDITOR PNG
// Archivo: poc-ai-haute-couture-comparison/generate_reference_inputs.cjs
// ==============================================================================
// Script autónomo en Node.js puro (sin modificar dependencias ni src/).
// Genera las imágenes y jaulas de referencia sintéticas idénticas para ambos
// proveedores e implementa el auditor geométrico determinístico sobre PNG.
// ==============================================================================

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const { Buffer } = require('node:buffer');

const ROOT_DIR = __dirname;
const INPUTS_DIR = path.join(ROOT_DIR, 'inputs');
const TEST_CASE_PATH = path.join(INPUTS_DIR, 'canonical_test_case.json');

const WIDTH = 1024;
const HEIGHT = 1536;
const CX = 512;
const SCALE_PX_PER_MM = 0.75; // 1680 mm -> 1260 px verticales

// Geometría corporal sintética calibrada en el lienzo 1024x1536
// Anchos proyectados anatómicos para silueta 96-68-102 (espalda 38 cm, estatura 168 cm)
const CAGE_SPEC = {
    canvasWidthPx: WIDTH,
    canvasHeightPx: HEIGHT,
    centerXPx: CX,
    scalePxPerMm: SCALE_PX_PER_MM,
    tolerancePct: 6.0,
    bgColorHex: '#FAF7F2',
    anatomyY: {
        crownPx: 100,       // +0 mm (coronilla referencia)
        neckTopPx: 262,     // base superior cuello maniquí
        neckBasePx: 300,    // cuello / C7
        shoulderPx: 332,    // línea biacromial
        upperBustPx: 416,   // alto busto / sisa
        bustPx: 472,        // línea de pecho (960 mm)
        underBustPx: 526,   // bajo busto
        waistPx: 604,       // cintura natural (680 mm)
        highHipPx: 678,     // cadera alta
        hipPx: 758,         // cadera mayor (1020 mm)
        midThighPx: 912,    // quiebre muslo medio / inicio godets
        kneePx: 1045,       // rodilla
        ankleHemPx: 1322,   // ruedo largo gala (cerca al suelo)
        floorPx: 1360,      // suelo (1680 mm)
    },
    // Semianchos (halfWidthPx) y anchos completos (widthPx) calibrados a 0.75 px/mm
    // Factor de proyección elíptica frontal real + holgura 'fitted' de vestido
    targetsPx: {
        neckBase: { yPx: 300, bodyWidthMm: 112, garmentEaseMm: 0, bodyHalfPx: 42, targetHalfPx: 42, label: 'Cuello' },
        shoulder: { yPx: 332, bodyWidthMm: 380, garmentEaseMm: 6, bodyHalfPx: 142.5, targetHalfPx: 144.8, label: 'Hombros (38.0 cm)' },
        bust: { yPx: 472, bodyWidthMm: 330, garmentEaseMm: 10, bodyHalfPx: 123.8, targetHalfPx: 127.5, label: 'Busto (96.0 cm)' },
        waist: { yPx: 604, bodyWidthMm: 234, garmentEaseMm: 6, bodyHalfPx: 87.8, targetHalfPx: 90.0, label: 'Cintura (68.0 cm)' },
        hip: { yPx: 758, bodyWidthMm: 356, garmentEaseMm: 10, bodyHalfPx: 133.5, targetHalfPx: 137.3, label: 'Cadera (102.0 cm)' },
    },
};

function clamp(v, lo, hi) {
    return v < lo ? lo : v > hi ? hi : v;
}

function hexToRgb(hex) {
    const clean = hex.replace('#', '');
    return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16),
    ];
}

// ==============================================================================
// CODIFICADOR Y DECODIFICADOR PNG EN NODE PURO (CRC32 + ZLIB + SCANLINES)
// ==============================================================================

const CRC_TABLE = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
        }
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const crcInput = Buffer.concat([typeBuf, data]);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(crcInput), 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodeRgbaPng(width, height, rgba) {
    const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(width, 0);
    ihdr.writeUInt32BE(height, 4);
    ihdr[8] = 8; // bit depth
    ihdr[9] = 6; // RGBA
    ihdr[10] = 0;
    ihdr[11] = 0;
    ihdr[12] = 0;

    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        const rowOut = y * (stride + 1);
        raw[rowOut] = 0; // filter None
        rgba.copy(raw, rowOut + 1, y * stride, (y + 1) * stride);
    }
    const compressed = zlib.deflateSync(raw, { level: 6 });

    return Buffer.concat([
        signature,
        makeChunk('IHDR', ihdr),
        makeChunk('IDAT', compressed),
        makeChunk('IEND', Buffer.alloc(0)),
    ]);
}

function paethPredictor(a, b, c) {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
}

function decodePngToRgba(pngBuf) {
    const sig = [137, 80, 78, 71, 13, 10, 26, 10];
    for (let i = 0; i < 8; i++) {
        if (pngBuf[i] !== sig[i]) {
            throw new Error('Buffer no corresponde a una firma PNG válida');
        }
    }
    let offset = 8;
    let width = 0;
    let height = 0;
    let bitDepth = 0;
    let colorType = 0;
    const idatParts = [];

    while (offset < pngBuf.length) {
        const len = pngBuf.readUInt32BE(offset);
        const type = pngBuf.toString('ascii', offset + 4, offset + 8);
        const dataStart = offset + 8;
        const dataEnd = dataStart + len;
        if (type === 'IHDR') {
            width = pngBuf.readUInt32BE(dataStart);
            height = pngBuf.readUInt32BE(dataStart + 4);
            bitDepth = pngBuf[dataStart + 8];
            colorType = pngBuf[dataStart + 9];
            const interlace = pngBuf[dataStart + 12];
            if (bitDepth !== 8 || interlace !== 0) {
                throw new Error(`PNG no soportado en auditoría pura: bitDepth=${bitDepth}, interlace=${interlace}`);
            }
        } else if (type === 'IDAT') {
            idatParts.push(pngBuf.subarray(dataStart, dataEnd));
        } else if (type === 'IEND') {
            break;
        }
        offset = dataEnd + 4;
    }

    const bpp = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 0 ? 1 : 0;
    if (bpp === 0) {
        throw new Error(`ColorType PNG no soportado para auditoría directa: ${colorType}`);
    }

    const inflated = zlib.inflateSync(Buffer.concat(idatParts));
    const stride = width * bpp;
    const unfiltered = Buffer.alloc(height * stride);

    for (let y = 0; y < height; y++) {
        const inRow = y * (stride + 1);
        const filterType = inflated[inRow];
        const outRow = y * stride;
        const prevRow = (y - 1) * stride;

        for (let i = 0; i < stride; i++) {
            const x = inflated[inRow + 1 + i];
            const a = i >= bpp ? unfiltered[outRow + i - bpp] : 0;
            const b = y > 0 ? unfiltered[prevRow + i] : 0;
            const c = y > 0 && i >= bpp ? unfiltered[prevRow + i - bpp] : 0;
            let val = x;
            if (filterType === 1) val = (x + a) & 0xff;
            else if (filterType === 2) val = (x + b) & 0xff;
            else if (filterType === 3) val = (x + ((a + b) >> 1)) & 0xff;
            else if (filterType === 4) val = (x + paethPredictor(a, b, c)) & 0xff;
            unfiltered[outRow + i] = val;
        }
    }

    const rgba = Buffer.alloc(width * height * 4);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const dst = (y * width + x) * 4;
            const src = y * stride + x * bpp;
            if (colorType === 6) {
                rgba[dst] = unfiltered[src];
                rgba[dst + 1] = unfiltered[src + 1];
                rgba[dst + 2] = unfiltered[src + 2];
                rgba[dst + 3] = unfiltered[src + 3];
            } else if (colorType === 2) {
                rgba[dst] = unfiltered[src];
                rgba[dst + 1] = unfiltered[src + 1];
                rgba[dst + 2] = unfiltered[src + 2];
                rgba[dst + 3] = 255;
            } else if (colorType === 4) {
                rgba[dst] = unfiltered[src];
                rgba[dst + 1] = unfiltered[src];
                rgba[dst + 2] = unfiltered[src];
                rgba[dst + 3] = unfiltered[src + 1];
            } else {
                rgba[dst] = unfiltered[src];
                rgba[dst + 1] = unfiltered[src];
                rgba[dst + 2] = unfiltered[src];
                rgba[dst + 3] = 255;
            }
        }
    }

    return { width, height, rgba };
}

// ==============================================================================
// PERFIL SUAVE PCHIP-LIKE DEL MANIQUÍ SINTÉTICO PARA RENDERIZADO CALIBRADO
// ==============================================================================

function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    return 0.5 * (
        2 * p1 +
        (-p0 + p2) * t +
        (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 +
        (-p0 + 3 * p1 - 3 * p2 + p3) * t3
    );
}

const PROFILE_KNOTS = [
    { y: 262, halfW: 41.0 },
    { y: 282, halfW: 40.5 },
    { y: 300, halfW: 45.0 },
    { y: 318, halfW: 112.0 },
    { y: 332, halfW: 142.5 }, // hombros 380 mm
    { y: 356, halfW: 138.0 },
    { y: 416, halfW: 121.5 }, // alto busto
    { y: 472, halfW: 123.8 }, // busto 960 mm
    { y: 526, halfW: 103.5 }, // bajo busto
    { y: 604, halfW: 87.8 },  // cintura 680 mm
    { y: 678, halfW: 120.0 }, // cadera alta
    { y: 758, halfW: 133.5 }, // cadera 1020 mm
    { y: 840, halfW: 118.0 },
    { y: 920, halfW: 82.0 },  // base forma corta Stockman / pelvis suave
    { y: 952, halfW: 20.0 },
];

function evaluateMannequinBodyHalfWidthPx(y) {
    if (y < PROFILE_KNOTS[0].y || y > PROFILE_KNOTS[PROFILE_KNOTS.length - 1].y) return 0;
    for (let i = 0; i < PROFILE_KNOTS.length - 1; i++) {
        const a = PROFILE_KNOTS[i];
        const b = PROFILE_KNOTS[i + 1];
        if (y >= a.y && y <= b.y) {
            const t = (y - a.y) / Math.max(1e-6, b.y - a.y);
            const p0 = PROFILE_KNOTS[Math.max(0, i - 1)].halfW;
            const p3 = PROFILE_KNOTS[Math.min(PROFILE_KNOTS.length - 1, i + 2)].halfW;
            const w = catmullRom(p0, a.halfW, b.halfW, p3, t);
            return Math.max(0, Math.min(Math.max(a.halfW, b.halfW) * 1.03, w));
        }
    }
    return 0;
}

function setPixel(rgba, w, x, y, r, g, b, alpha = 1) {
    if (x < 0 || x >= w || y < 0 || y >= HEIGHT) return;
    const idx = (y * w + x) * 4;
    if (alpha >= 0.999) {
        rgba[idx] = r;
        rgba[idx + 1] = g;
        rgba[idx + 2] = b;
        rgba[idx + 3] = 255;
    } else {
        const inv = 1 - alpha;
        rgba[idx] = Math.round(rgba[idx] * inv + r * alpha);
        rgba[idx + 1] = Math.round(rgba[idx + 1] * inv + g * alpha);
        rgba[idx + 2] = Math.round(rgba[idx + 2] * inv + b * alpha);
        rgba[idx + 3] = 255;
    }
}

function buildReferenceMannequinPng() {
    const rgba = Buffer.alloc(WIDTH * HEIGHT * 4);
    const [bgR, bgG, bgB] = hexToRgb(CAGE_SPEC.bgColorHex);

    // 1. Fondo estudio marfil suave con viñeta casi imperceptible y plano de suelo
    for (let y = 0; y < HEIGHT; y++) {
        const floorFade = y > CAGE_SPEC.anatomyY.floorPx ? clamp((y - CAGE_SPEC.anatomyY.floorPx) / 140, 0, 1) * 10 : 0;
        for (let x = 0; x < WIDTH; x++) {
            const dx = (x - CX) / WIDTH;
            const dy = (y - HEIGHT * 0.45) / HEIGHT;
            const vig = Math.min(10, (dx * dx + dy * dy) * 18);
            const idx = (y * WIDTH + x) * 4;
            rgba[idx] = Math.round(bgR - vig - floorFade);
            rgba[idx + 1] = Math.round(bgG - vig - floorFade);
            rgba[idx + 2] = Math.round(bgB - vig - floorFade * 0.8);
            rgba[idx + 3] = 255;
        }
    }

    // 2. Sombra suave bajo el pedestal del maniquí
    const shadowY = CAGE_SPEC.anatomyY.floorPx;
    for (let y = shadowY - 26; y <= shadowY + 26; y++) {
        for (let x = CX - 190; x <= CX + 190; x++) {
            const nx = (x - CX) / 170;
            const ny = (y - shadowY) / 22;
            const d = nx * nx + ny * ny;
            if (d < 1) {
                const a = (1 - d) * (1 - d) * 0.16;
                setPixel(rgba, WIDTH, x, y, 42, 31, 24, a);
            }
        }
    }

    // 3. Mástil de latón champagne y base de madera de taller (y = 920..1360)
    for (let y = 920; y <= 1344; y++) {
        for (let x = CX - 8; x <= CX + 8; x++) {
            const shade = 1 - Math.abs(x - (CX - 2)) / 10;
            const r = Math.round(150 + 58 * shade);
            const g = Math.round(125 + 48 * shade);
            const b = Math.round(88 + 38 * shade);
            setPixel(rgba, WIDTH, x, y, r, g, b, 1);
        }
    }
    // Base madera noble
    for (let y = 1338; y <= 1362; y++) {
        const hw = Math.round(122 + (y - 1338) * 0.4);
        for (let x = CX - hw; x <= CX + hw; x++) {
            const edge = Math.abs(x - CX) / hw;
            const tone = 1 - edge * 0.35;
            setPixel(rgba, WIDTH, x, y, Math.round(58 * tone), Math.round(42 * tone), Math.round(33 * tone), 1);
        }
    }
    // Remate de cuello (finial de madera/latón)
    for (let y = 236; y <= 264; y++) {
        const ny = (y - 250) / 14;
        const rx = Math.max(0, 44 * Math.sqrt(Math.max(0, 1 - ny * ny * 0.72)));
        for (let x = Math.floor(CX - rx); x <= Math.ceil(CX + rx); x++) {
            const nx = (x - CX) / Math.max(1, rx);
            const shade = 0.75 + 0.25 * (1 - nx) * 0.6;
            setPixel(rgba, WIDTH, x, y, Math.round(170 * shade), Math.round(138 * shade), Math.round(98 * shade), 1);
        }
    }

    // 4. Torso paramétrico Stockman en lino marfil calibrado con volumen 3D sutil
    for (let y = 262; y <= 952; y++) {
        const hw = evaluateMannequinBodyHalfWidthPx(y);
        if (hw <= 0.5) continue;
        for (let x = Math.floor(CX - hw - 1); x <= Math.ceil(CX + hw + 1); x++) {
            const dist = Math.abs(x - CX);
            if (dist > hw + 1) continue;
            const aa = clamp(hw + 0.8 - dist, 0, 1);
            const nx = clamp((x - CX) / Math.max(1, hw), -1, 1);
            // Volumen cilíndrico + modelado leve en busto
            const cylinderLight = 0.84 + 0.14 * Math.sqrt(Math.max(0, 1 - nx * nx * 0.82)) - nx * 0.05;
            const bustBell = Math.exp(-Math.pow((y - 472) / 48, 2));
            const bilateral = Math.exp(-Math.pow((Math.abs(x - CX) - 52) / 36, 2));
            const highlight = bustBell * bilateral * 0.05;
            const l = clamp(cylinderLight + highlight, 0.70, 1.03);

            let baseR = Math.round(234 * l);
            let baseG = Math.round(225 * l);
            let baseB = Math.round(211 * l);

            // Contorno limpio de frontera para contraste fiable y verificación geométrica
            if (dist >= hw - 2.0) {
                baseR = Math.round(baseR * 0.72 + 40 * 0.28);
                baseG = Math.round(baseG * 0.72 + 34 * 0.28);
                baseB = Math.round(baseB * 0.72 + 28 * 0.28);
            } else {
                // Costura centro delantero y líneas princesa discretas de taller
                const princessOffset = 46 + (y - 332) * 0.015;
                if (Math.abs(x - CX) < 0.8 || (y > 325 && y < 860 && Math.abs(Math.abs(x - CX) - princessOffset) < 0.75)) {
                    baseR = Math.round(baseR * 0.86);
                    baseG = Math.round(baseG * 0.85);
                    baseB = Math.round(baseB * 0.83);
                }
            }

            setPixel(rgba, WIDTH, x, y, baseR, baseG, baseB, aa);
        }
    }

    // 5. Cintas métricas horizontales discretas en oro champán sobre busto (472), cintura (604) y cadera (758)
    for (const key of ['shoulder', 'bust', 'waist', 'hip']) {
        const t = CAGE_SPEC.targetsPx[key];
        const hw = evaluateMannequinBodyHalfWidthPx(t.yPx);
        for (let dy = -1; dy <= 1; dy++) {
            const yy = t.yPx + dy;
            for (let x = Math.round(CX - hw + 2); x <= Math.round(CX + hw - 2); x++) {
                setPixel(rgba, WIDTH, x, yy, 182, 146, 94, 0.78);
            }
            // Guías laterales de cota discretas en los bordes externos (sin cruzar el cuerpo)
            if (dy === 0) {
                for (let x = 90; x <= 145; x++) {
                    setPixel(rgba, WIDTH, x, yy, 165, 134, 90, 0.55);
                }
                for (let x = WIDTH - 145; x <= WIDTH - 90; x++) {
                    setPixel(rgba, WIDTH, x, yy, 165, 134, 90, 0.55);
                }
            }
        }
    }

    return encodeRgbaPng(WIDTH, HEIGHT, rgba);
}

function buildReferenceFabricSwatchPng() {
    const w = 512;
    const h = 512;
    const rgba = Buffer.alloc(w * h * 4);
    const [emR, emG, emB] = hexToRgb('#124E3F'); // Mikado Verde Esmeralda Profundo
    const [auR, auG, auB] = hexToRgb('#C5A880'); // Bordado Oro Champagne

    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const idx = (y * w + x) * 4;
            if (x < 360) {
                // Efecto sarga diagonal con brillo sedoso silk_sheen
                const twill = Math.sin((x + y) * 0.55) * 6;
                const sheenWave = Math.sin(x * 0.025 + Math.sin(y * 0.015) * 1.4) * 24;
                rgba[idx] = clamp(Math.round(emR + twill + sheenWave), 0, 255);
                rgba[idx + 1] = clamp(Math.round(emG + twill + sheenWave * 1.15), 0, 255);
                rgba[idx + 2] = clamp(Math.round(emB + twill + sheenWave * 0.95), 0, 255);
                rgba[idx + 3] = 255;
            } else {
                // Bloque Chantilly oro champagne sobre tul fino oscuro
                const lacePattern = Math.abs(Math.sin(x * 0.19) * Math.cos(y * 0.19));
                const bead = ((x % 24 < 5) && (y % 24 < 5)) ? 1 : 0;
                const mix = clamp(lacePattern * 0.65 + bead * 0.55, 0, 1);
                rgba[idx] = Math.round(30 * (1 - mix) + auR * mix);
                rgba[idx + 1] = Math.round(46 * (1 - mix) + auG * mix);
                rgba[idx + 2] = Math.round(40 * (1 - mix) + auB * mix);
                rgba[idx + 3] = 255;
            }
        }
    }
    return encodeRgbaPng(w, h, rgba);
}

function buildBodyCageOverlaySvg() {
    const t = CAGE_SPEC.targetsPx;
    const band = (val, sign) => val * (1 + sign * (CAGE_SPEC.tolerancePct / 100));
    const lines = Object.values(t).map((item) => {
        const xL = CX - item.targetHalfPx;
        const xR = CX + item.targetHalfPx;
        const xMinL = CX - band(item.targetHalfPx, 1);
        const xMinR = CX + band(item.targetHalfPx, 1);
        return `
  <g>
    <line x1="${xMinL.toFixed(1)}" y1="${item.yPx}" x2="${xMinR.toFixed(1)}" y2="${item.yPx}" stroke="#10B981" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.65" />
    <line x1="${xL.toFixed(1)}" y1="${item.yPx}" x2="${xR.toFixed(1)}" y2="${item.yPx}" stroke="#D97706" stroke-width="2.5" />
    <circle cx="${xL.toFixed(1)}" cy="${item.yPx}" r="4.5" fill="#10B981" stroke="#FFFFFF" stroke-width="1.2" />
    <circle cx="${xR.toFixed(1)}" cy="${item.yPx}" r="4.5" fill="#10B981" stroke="#FFFFFF" stroke-width="1.2" />
    <rect x="${(xR + 14).toFixed(1)}" y="${item.yPx - 12}" width="210" height="24" rx="4" fill="rgba(255,255,255,0.88)" stroke="#D97706" stroke-width="1" />
    <text x="${(xR + 22).toFixed(1)}" y="${item.yPx + 4}" font-family="sans-serif" font-size="12" font-weight="700" fill="#1F2937">${item.label} · ${(item.targetHalfPx * 2).toFixed(0)} px</text>
  </g>`;
    }).join('\n');

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="${WIDTH}" height="${HEIGHT}">
  <rect x="2" y="2" width="${WIDTH - 4}" height="${HEIGHT - 4}" fill="none" stroke="#C5A880" stroke-width="2" stroke-dasharray="8 8" opacity="0.5" />
  <line x1="${CX}" y1="${CAGE_SPEC.anatomyY.crownPx}" x2="${CX}" y2="${CAGE_SPEC.anatomyY.floorPx}" stroke="#6B7280" stroke-width="1.2" stroke-dasharray="6 6" opacity="0.6" />
  <line x1="64" y1="${CAGE_SPEC.anatomyY.crownPx}" x2="64" y2="${CAGE_SPEC.anatomyY.floorPx}" stroke="#1F2937" stroke-width="1.8" />
  <text x="74" y="${CAGE_SPEC.anatomyY.crownPx + 14}" font-family="sans-serif" font-size="13" font-weight="700" fill="#1F2937">Estatura 168.0 cm (${((CAGE_SPEC.anatomyY.floorPx - CAGE_SPEC.anatomyY.crownPx)).toFixed(0)} px @ 0.75 px/mm)</text>
  <line x1="64" y1="${CAGE_SPEC.anatomyY.floorPx}" x2="${WIDTH - 64}" y2="${CAGE_SPEC.anatomyY.floorPx}" stroke="#1F2937" stroke-width="1.5" stroke-dasharray="4 4" opacity="0.6" />
  ${lines}
</svg>
`;
}

// ==============================================================================
// AUDITOR GEOMÉTRICO DETERMINÍSTICO POST-GENERACIÓN SOBRE SILUETA PNG
// ==============================================================================

function auditGeneratedSilhouettePng(pngBuffer) {
    const decoded = decodePngToRgba(pngBuffer);
    const { width, height, rgba } = decoded;
    const scaleX = width / WIDTH;
    const scaleY = height / HEIGHT;

    // Estimar color de fondo promedio desde las 4 esquinas superiores
    const samples = [
        [8, 8],
        [width - 9, 8],
        [8, Math.floor(height * 0.25)],
        [width - 9, Math.floor(height * 0.25)],
    ];
    let bgR = 0;
    let bgG = 0;
    let bgB = 0;
    for (const [sx, sy] of samples) {
        const idx = (sy * width + sx) * 4;
        bgR += rgba[idx];
        bgG += rgba[idx + 1];
        bgB += rgba[idx + 2];
    }
    bgR /= samples.length;
    bgG /= samples.length;
    bgB /= samples.length;

    const isForeground = (x, y) => {
        const idx = (y * width + x) * 4;
        if (rgba[idx + 3] < 40) return false;
        const diff =
            Math.abs(rgba[idx] - bgR) +
            Math.abs(rgba[idx + 1] - bgG) +
            Math.abs(rgba[idx + 2] - bgB);
        return diff > 32;
    };

    const measureZoneWidth = (zoneKey) => {
        const spec = CAGE_SPEC.targetsPx[zoneKey];
        const yCenter = Math.round(spec.yPx * scaleY);
        const widths = [];
        for (let dy = -3; dy <= 3; dy++) {
            const yy = clamp(yCenter + dy, 0, height - 1);
            // Buscar contornos externos dentro de la franja central [15%..85%] para evitar bordes/artefactos laterales
            let left = -1;
            let right = -1;
            const xLo = Math.floor(width * 0.16);
            const xHi = Math.floor(width * 0.84);
            for (let x = xLo; x <= xHi; x++) {
                if (isForeground(x, yy)) {
                    left = x;
                    break;
                }
            }
            for (let x = xHi; x >= xLo; x--) {
                if (isForeground(x, yy)) {
                    right = x;
                    break;
                }
            }
            if (left >= 0 && right > left) {
                widths.push((right - left) / scaleX);
            }
        }
        const measuredWidthPx = widths.length > 0
            ? widths.sort((a, b) => a - b)[Math.floor(widths.length / 2)]
            : 0;
        const targetWidthPx = spec.targetHalfPx * 2;
        const deviationPct = targetWidthPx > 0
            ? (Math.abs(measuredWidthPx - targetWidthPx) / targetWidthPx) * 100
            : 100;

        return {
            zone: zoneKey,
            label: spec.label,
            yPx: spec.yPx,
            targetWidthPx: Math.round(targetWidthPx * 10) / 10,
            measuredWidthPx: Math.round(measuredWidthPx * 10) / 10,
            deviationPct: Math.round(deviationPct * 100) / 100,
            withinTolerance: measuredWidthPx > 0 && deviationPct <= CAGE_SPEC.tolerancePct,
        };
    };

    const zones = ['shoulder', 'bust', 'waist', 'hip'].map(measureZoneWidth);
    const maxDeviationPct = Math.max(...zones.map((z) => z.deviationPct));
    const measuredWaist = zones.find((z) => z.zone === 'waist').measuredWidthPx;
    const measuredHip = zones.find((z) => z.zone === 'hip').measuredWidthPx;
    const measuredBust = zones.find((z) => z.zone === 'bust').measuredWidthPx;

    return {
        imageDimensions: { width, height },
        backgroundDetectedRgb: [Math.round(bgR), Math.round(bgG), Math.round(bgB)],
        tolerancePct: CAGE_SPEC.tolerancePct,
        verdict: zones.every((z) => z.withinTolerance) ? 'FIDELITY_PASS' : 'PROPORTION_DRIFT_WARNING',
        maxDeviationPct: Math.round(maxDeviationPct * 100) / 100,
        renderedRatios: {
            waistToBustWidthRatio: measuredBust > 0 ? Math.round((measuredWaist / measuredBust) * 1000) / 1000 : 0,
            waistToHipWidthRatio: measuredHip > 0 ? Math.round((measuredWaist / measuredHip) * 1000) / 1000 : 0,
        },
        zones,
    };
}

function generateAllReferenceInputs() {
    fs.mkdirSync(INPUTS_DIR, { recursive: true });
    const mannequinPng = buildReferenceMannequinPng();
    const swatchPng = buildReferenceFabricSwatchPng();
    const cageSvg = buildBodyCageOverlaySvg();

    fs.writeFileSync(path.join(INPUTS_DIR, 'reference_mannequin_1024x1536.png'), mannequinPng);
    fs.writeFileSync(path.join(INPUTS_DIR, 'reference_fabric_swatch_512x512.png'), swatchPng);
    fs.writeFileSync(path.join(INPUTS_DIR, 'reference_body_cage_overlay.svg'), cageSvg, 'utf8');

    const baselineAudit = auditGeneratedSilhouettePng(mannequinPng);
    fs.writeFileSync(
        path.join(INPUTS_DIR, 'cage_spec.json'),
        JSON.stringify({ cageSpec: CAGE_SPEC, mannequinSelfAudit: baselineAudit }, null, 2),
        'utf8'
    );

    return {
        mannequinPath: path.join(INPUTS_DIR, 'reference_mannequin_1024x1536.png'),
        swatchPath: path.join(INPUTS_DIR, 'reference_fabric_swatch_512x512.png'),
        cageSvgPath: path.join(INPUTS_DIR, 'reference_body_cage_overlay.svg'),
        testCasePath: TEST_CASE_PATH,
        mannequinSelfAudit: baselineAudit,
    };
}

if (require.main === module) {
    const out = generateAllReferenceInputs();
    console.log('[RefGen] Insumos sintéticos generados en poc-ai-haute-couture-comparison/inputs/');
    console.log('[RefGen] Auto-auditoría geométrica maniquí base:', JSON.stringify(out.mannequinSelfAudit));
}

module.exports = {
    CAGE_SPEC,
    generateAllReferenceInputs,
    auditGeneratedSilhouettePng,
};
