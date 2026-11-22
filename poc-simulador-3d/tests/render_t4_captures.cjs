/* global __dirname */
// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): CAPTURAS WEBGL BENCHMARK T4
// Archivo: poc-simulador-3d/tests/render_t4_captures.cjs
// ==============================================================================
// Genera 5 capturas PNG WebGL comparativas de los arquetipos textiles T4 en
// poc-simulador-3d/results/t4/captures/ mediante Playwright + MS Edge.
// ==============================================================================

const http = require('http');
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const pocRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pocRoot, '..');
const capturesDir = path.join(pocRoot, 'results', 't4', 'captures');
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
            const filePath = path.join(base, safeRel || 'viewer/t4_archetypes_viewer.html');
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
        const page = await browser.newPage({ viewport: { width: 1540, height: 940 } });
        const jobs = [
            {
                query: '?mode=compare3&scene=T4_GATHERED_PLEAT_DRAPE&kf=3',
                out: 't4_01_gathered_drape_compare_t3s.png',
            },
            {
                query: '?mode=cantilever&scene=T4_CANTILEVER_OVERHANG&kf=3',
                out: 't4_02_cantilever_and_asymmetry_t3s.png',
            },
            {
                query: '?mode=compare3&scene=T4_TORSO_FRONT_BODICE_ALT_C&kf=3',
                out: 't4_03_torso_bodice_altC_compare_t5s.png',
            },
            {
                query: '?mode=compare3&scene=T4_TORSO_SHOULDER_ANCHORED_ALT_C&kf=3',
                out: 't4_04_torso_shoulder_anchored_altC_compare_t5s.png',
            },
            {
                query: '?mode=asymSide&scene=T4_TORSO_FRONT_BODICE_ALT_C&kf=3',
                out: 't4_05_torso_bodice_asymmetric_side_t5s.png',
            },
        ];

        for (const job of jobs) {
            const url = `http://127.0.0.1:${port}/viewer/t4_archetypes_viewer.html${job.query}`;
            await page.goto(url, { waitUntil: 'networkidle' });
            await page.waitForFunction(() => window.__T4_VIEWER_READY__ === true, null, { timeout: 15000 });
            await page.waitForTimeout(200);
            const outPath = path.join(capturesDir, job.out);
            await page.screenshot({ path: outPath, fullPage: true });
            console.log(`[T4 CAPTURE] ${outPath}`);
        }
    } finally {
        await browser.close();
        server.close();
    }
})();

