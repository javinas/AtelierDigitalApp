/* global __dirname */
// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): CAPTURAS WEBGL Y BENCH RENDER T2
// Archivo: poc-simulador-3d/tests/render_t2_captures.cjs
// ==============================================================================
// Sirve poc-simulador-3d/ y node_modules/three localmente en 127.0.0.1 y abre
// Playwright Chromium para:
//   1. Capturar imágenes comparativas 2D/3D reales (t=0.5s, 2.0s, 10.0s + individuales)
//   2. Medir renderMs WebGL real (mean/p50/p95) sobre 16x16 y 32x32 en Chromium
// ==============================================================================

const fs = require('fs');
const path = require('path');
const http = require('http');
const { chromium } = require('playwright');

const repoRoot = path.resolve(__dirname, '..', '..');
const pocRoot = path.resolve(__dirname, '..');
const capturesDir = path.join(pocRoot, 'results', 't2', 'captures');
fs.mkdirSync(capturesDir, { recursive: true });

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
};

function startStaticServer() {
    return new Promise((resolve) => {
        const server = http.createServer((req, res) => {
            const urlPath = (req.url || '/').split('?')[0];
            let targetFile;
            if (urlPath.startsWith('/node_modules/')) {
                targetFile = path.join(repoRoot, urlPath);
            } else {
                targetFile = path.join(pocRoot, urlPath === '/' ? 'viewer/t2_scene0_viewer.html' : urlPath);
            }

            if (!targetFile.startsWith(repoRoot) || !fs.existsSync(targetFile) || fs.statSync(targetFile).isDirectory()) {
                res.writeHead(404);
                res.end('Not found');
                return;
            }
            const ext = path.extname(targetFile);
            res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
            fs.createReadStream(targetFile).pipe(res);
        });
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            resolve({ server, port: addr.port });
        });
    });
}

async function runCaptures() {
    const { server, port } = await startStaticServer();
    const baseUrl = `http://127.0.0.1:${port}/viewer/t2_scene0_viewer.html`;
    const edgePath = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe';
    const launchOpts = {
        headless: true,
        args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-webgl'],
    };
    if (fs.existsSync(edgePath)) {
        launchOpts.executablePath = edgePath;
    } else {
        launchOpts.channel = 'msedge';
    }
    const browser = await chromium.launch(launchOpts);

    try {
        const page = await browser.newPage({ viewport: { width: 1440, height: 840 } });

        const captureJobs = [
            { query: '?mode=compare&kf=1', file: '01_compare_t050s.png' },
            { query: '?mode=compare&kf=2', file: '02_compare_t200s.png' },
            { query: '?mode=compare&kf=4', file: '03_compare_t1000s_equilibrium.png' },
            { query: '?mode=single&run=xpbd_16x16&kf=4', file: '04_xpbd_16x16_t10s.png' },
            { query: '?mode=single&run=xpbd_32x32&kf=4', file: '05_xpbd_32x32_t10s.png' },
            { query: '?mode=single&run=pbd_16x16&kf=4', file: '06_pbd_16x16_t10s.png' },
            { query: '?mode=single&run=pbd_32x32&kf=4', file: '07_pbd_32x32_t10s.png' },
        ];

        const capturedFiles = [];
        for (const job of captureJobs) {
            await page.goto(`${baseUrl}${job.query}`, { waitUntil: 'networkidle' });
            await page.waitForFunction(() => Boolean(window.__T2_READY__));
            const outPath = path.join(capturesDir, job.file);
            await page.screenshot({ path: outPath });
            capturedFiles.push(outPath);
        }

        const renderBenchmarks = [];
        for (const runId of ['xpbd_16x16', 'xpbd_32x32', 'pbd_16x16', 'pbd_32x32']) {
            await page.goto(`${baseUrl}?mode=bench&run=${runId}`, { waitUntil: 'networkidle' });
            await page.waitForFunction(() => window.__T2_READY__?.mode === 'bench');
            const stats = await page.evaluate(() => window.__T2_READY__);
            renderBenchmarks.push(stats);
        }

        const reportPath = path.join(pocRoot, 'results', 't2', 't2_webgl_render_metrics.json');
        const payload = {
            measuredAtIso: new Date().toISOString(),
            rendererBackend: 'Chromium Headless WebGL (ANGLE SwiftShader)',
            capturedFiles,
            renderBenchmarks,
        };
        fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2), 'utf8');
        console.log(JSON.stringify(payload, null, 2));
    } finally {
        await browser.close();
        server.close();
    }
}

runCaptures().catch((err) => {
    console.error(err);
    process.exit(1);
});
