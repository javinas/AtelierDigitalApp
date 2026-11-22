/* global __dirname */
// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): CAPTURAS WEBGL BENCHMARK T3
// Archivo: poc-simulador-3d/tests/render_t3_captures.cjs
// ==============================================================================
// Captura vistas 3D reales WebGL en Chromium/Edge headless de las escenas T3
// comparando Alternativa A (Malla+SpatialHash), B (10 Cápsulas/Elipsoides) y
// C (Grid SDF 3D) en poc-simulador-3d/results/t3/captures/.
// ==============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const pocRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pocRoot, '..');
const capturesDir = path.join(pocRoot, 'results', 't3', 'captures');
fs.mkdirSync(capturesDir, { recursive: true });

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
};

function startStaticServer() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const urlPath = (req.url || '/').split('?')[0];
            const safeRel = urlPath.replace(/^\/+/, '');
            const base = safeRel.startsWith('node_modules/') ? repoRoot : pocRoot;
            const filePath = path.join(base, safeRel || 'viewer/t3_collision_viewer.html');
            if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
                res.statusCode = 404;
                res.end(`Not found: ${urlPath}`);
                return;
            }
            const ext = path.extname(filePath);
            res.setHeader('Content-Type', MIME[ext] || 'application/octet-stream');
            fs.createReadStream(filePath).pipe(res);
        });
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            resolve({ server, port: addr.port });
        });
    });
}

(async () => {
    const { server, port } = await startStaticServer();
    const browser = await chromium.launch({
        channel: 'msedge',
        headless: true,
        args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
    });

    try {
        const page = await browser.newPage({ viewport: { width: 1520, height: 920 } });
        const jobs = [
            {
                query: '?mode=compare&scene=T3_SHOULDER_DROP&kf=4',
                out: 't3_01_shoulder_drop_compare_t5s.png',
            },
            {
                query: '?mode=compare&scene=T3_FRONT_BODICE_PANEL&kf=4',
                out: 't3_02_front_bodice_compare_t5s.png',
            },
            {
                query: '?mode=single&scene=T3_FRONT_BODICE_PANEL&alt=ALT_A_MESH_SPATIAL_HASH&kf=4&view=side',
                out: 't3_03_bodice_altA_side_t5s.png',
            },
            {
                query: '?mode=single&scene=T3_FRONT_BODICE_PANEL&alt=ALT_B_CAPSULES_ELLIPSOIDS&kf=4&view=side',
                out: 't3_04_bodice_altB_side_t5s.png',
            },
            {
                query: '?mode=single&scene=T3_FRONT_BODICE_PANEL&alt=ALT_C_SDF_GRID_3D&kf=4&view=side',
                out: 't3_05_bodice_altC_side_t5s.png',
            },
        ];

        for (const job of jobs) {
            const url = `http://127.0.0.1:${port}/viewer/t3_collision_viewer.html${job.query}`;
            await page.goto(url, { waitUntil: 'networkidle' });
            await page.waitForFunction(() => window.__T3_VIEWER_READY__ === true, null, { timeout: 15000 });
            await page.waitForTimeout(200);
            const outPath = path.join(capturesDir, job.out);
            await page.screenshot({ path: outPath, fullPage: true });
            console.log(`[T3 CAPTURE] ${outPath}`);
        }
    } finally {
        await browser.close();
        server.close();
    }
})();

