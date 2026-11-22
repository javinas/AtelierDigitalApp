/* global __dirname */
// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): CAPTURAS VISUALES T5.2 (THREE.JS)
// Archivo: poc-simulador-3d/tests/render_t5_2_captures.cjs
// ==============================================================================

const fs = require('fs');
const http = require('http');
const path = require('path');
const { chromium } = require('playwright');

const pocRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(pocRoot, '..');
const capturesDir = path.join(pocRoot, 'results', 't5_2', 'captures');
const summaryPath = path.join(pocRoot, 'results', 't5_2', 't52_summary_report.json');
fs.mkdirSync(capturesDir, { recursive: true });

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
};

function startStaticServer() {
    const server = http.createServer((req, res) => {
        const cleanUrl = (req.url || '/').split('?')[0];
        let targetPath;
        if (cleanUrl.startsWith('/node_modules/')) {
            targetPath = path.join(repoRoot, cleanUrl.slice(1));
        } else {
            targetPath = path.join(pocRoot, cleanUrl.slice(1));
        }
        if (!targetPath.startsWith(pocRoot) && !targetPath.startsWith(path.join(repoRoot, 'node_modules'))) {
            res.writeHead(403);
            res.end('Forbidden');
            return;
        }
        if (!fs.existsSync(targetPath) || fs.statSync(targetPath).isDirectory()) {
            res.writeHead(404);
            res.end('Not found');
            return;
        }
        const ext = path.extname(targetPath).toLowerCase();
        res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
        fs.createReadStream(targetPath).pipe(res);
    });

    return new Promise((resolve) => {
        server.listen(0, '127.0.0.1', () => {
            const addr = server.address();
            resolve({ server, baseUrl: `http://127.0.0.1:${addr.port}` });
        });
    });
}

(async () => {
    let bestNoRamp = 'GEOM_PLUS_GUARD';
    let bestRamp = 'GEOM_PLUS_GUARD_RAMP10';
    if (fs.existsSync(summaryPath)) {
        const report = JSON.parse(fs.readFileSync(summaryPath, 'utf8'));
        if (report.recommendation) {
            bestNoRamp = report.recommendation.bestWithoutRampId || bestNoRamp;
            bestRamp = report.recommendation.bestWithRamp10Id || bestRamp;
        }
    }

    const { server, baseUrl } = await startStaticServer();
    const browser = await chromium.launch({
        headless: true,
        channel: 'msedge',
        args: [
            '--use-gl=angle',
            '--use-angle=swiftshader',
            '--enable-webgl',
            '--ignore-gpu-blocklist',
        ],
    });

    const shots = [
        { name: '01_t52_compare4_posterior_5s.png', query: `mode=compareConfigs&config=${bestNoRamp}&arch=ARCH1_FLUID_LIGHT&kf=3` },
        { name: '02_t52_back_neck_scapula_closeup.png', query: `mode=backNeckCloseup&config=${bestRamp}&arch=ARCH1_FLUID_LIGHT&kf=3` },
        { name: '03_t52_views4_initial_t0.png', query: `mode=views4&config=${bestNoRamp}&arch=ARCH2_MEDIUM_BALANCED&kf=0` },
        { name: '04_t52_views4_equilibrium_5s.png', query: `mode=views4&config=${bestRamp}&arch=ARCH2_MEDIUM_BALANCED&kf=3` },
        { name: '05_t52_compare3_textiles_5s.png', query: `mode=compare3&config=${bestRamp}&kf=3` },
        { name: '06_t52_asym_face_up_vs_down.png', query: `mode=asym2&config=${bestRamp}&kf=3` },
    ];

    try {
        const page = await browser.newPage({ viewport: { width: 1520, height: 840 } });
        for (const shot of shots) {
            await page.goto(`${baseUrl}/viewer/t5_2_garment_viewer.html?${shot.query}`, {
                waitUntil: 'networkidle',
            });
            await page.waitForFunction(() => window.__T52_VIEWER_READY__ === true, {
                timeout: 15000,
            });
            await page.waitForTimeout(120);
            const outPath = path.join(capturesDir, shot.name);
            await page.screenshot({ path: outPath });
            console.log(`[T5.2-Capture] Guardada ${shot.name}`);
        }
    } finally {
        await browser.close();
        server.close();
    }
})();

