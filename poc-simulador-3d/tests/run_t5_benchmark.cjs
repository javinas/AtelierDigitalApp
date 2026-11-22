/* global __dirname */
// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): EJECUTOR BENCHMARK T5 (PRIMERA PRENDA)
// Archivo: poc-simulador-3d/tests/run_t5_benchmark.cjs
// ==============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const pocRoot = path.resolve(__dirname, '..');
const resultsDir = path.join(pocRoot, 'results', 't5');
fs.mkdirSync(resultsDir, { recursive: true });

const cache = new Map();

function resolveTsFile(requestingDir, specifier) {
    if (!specifier.startsWith('.')) {
        return null;
    }
    const basePath = path.resolve(requestingDir, specifier);
    const candidates = [basePath, `${basePath}.ts`, path.join(basePath, 'index.ts')];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return candidate;
        }
    }
    throw new Error(`No se pudo resolver módulo PoC '${specifier}' desde ${requestingDir}`);
}

function loadTsModule(filePath) {
    const normalized = path.resolve(filePath);
    if (cache.has(normalized)) {
        return cache.get(normalized).exports;
    }

    const source = fs.readFileSync(normalized, 'utf8');
    const transpiled = ts.transpileModule(source, {
        fileName: normalized,
        compilerOptions: {
            module: ts.ModuleKind.CommonJS,
            target: ts.ScriptTarget.ES2022,
            strict: true,
            esModuleInterop: true,
        },
        reportDiagnostics: true,
    });

    if (transpiled.diagnostics && transpiled.diagnostics.length > 0) {
        const msg = transpiled.diagnostics
            .map((d) => ts.flattenDiagnosticMessageText(d.messageText, '\n'))
            .join('\n');
        throw new Error(`Errores TypeScript en ${normalized}:\n${msg}`);
    }

    const mod = { exports: {} };
    cache.set(normalized, mod);
    const dir = path.dirname(normalized);

    const localRequire = (specifier) => {
        const resolved = resolveTsFile(dir, specifier);
        if (resolved) {
            return loadTsModule(resolved);
        }
        return require(specifier);
    };

    const wrapped = vm.runInThisContext(
        `(function(exports, require, module, __filename, __dirname) {\n${transpiled.outputText}\n})`,
        { filename: normalized }
    );
    wrapped(mod.exports, localRequire, mod, normalized, dir);

    return mod.exports;
}

const { runT5FirstGarmentBenchmark } = loadTsModule(
    path.join(__dirname, 't5FirstGarmentBenchmark.ts')
);

console.log('[T5] Ejecutando primera prenda (corpiño 2 paneles) en matriz 4 variantes x 5 perfiles textiles...');
const t0 = Date.now();
const { report, batches, keyframeBundle } = runT5FirstGarmentBenchmark();
const elapsedS = ((Date.now() - t0) / 1000).toFixed(2);

fs.writeFileSync(
    path.join(resultsDir, 't5_summary_report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
);
fs.writeFileSync(
    path.join(resultsDir, 't5_keyframe_meshes.json'),
    JSON.stringify(keyframeBundle),
    'utf8'
);

for (const [runId, batch] of Object.entries(batches)) {
    fs.writeFileSync(
        path.join(resultsDir, `telemetry_${runId}.json`),
        JSON.stringify(batch),
        'utf8'
    );
}

console.log(`[T5] Completado en ${elapsedS} s (${report.runs.length} corridas).`);
console.log('[T5] Geometría inicial:', JSON.stringify(report.patternGeometry));
console.log('[T5] Scorecards por variante:');
for (const sc of report.scorecards) {
    console.log(
        `  * ${sc.solverId}: strict=${sc.strictPassCount}/${sc.runsCount} panelPass=${sc.seamOrPanelPassCount}/${sc.runsCount} | ` +
        `panelPeak=${sc.worstPanelPeakStretchPct}% combPeak=${sc.worstCombinedPeakStretchPct}% seamGapMax=${sc.worstSeamMaxGapMm}mm | ` +
        `mean=${sc.meanTotalStepMs}ms (worst=${sc.worstTotalStepMeanMs}ms, P95=${sc.worstTotalStepP95Ms}ms) col=${sc.meanCollisionMs}ms | ` +
        `gtEqFrames=${sc.worstGtEqSevereFrames} texDiff=${sc.textileDifferentiationPass} asym=${sc.asymmetryContrastPass}`
    );
}
console.log('[T5] Asimetría:', JSON.stringify(report.asymmetryComparisons));
console.log('[T5] Recomendación:', JSON.stringify(report.recommendation, null, 2));

