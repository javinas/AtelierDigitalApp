/* global __dirname */
// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): EJECUTOR BENCHMARK CORRECTIVO T5.1
// Archivo: poc-simulador-3d/tests/run_t5_1_benchmark.cjs
// ==============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const pocRoot = path.resolve(__dirname, '..');
const resultsDir = path.join(pocRoot, 'results', 't5_1');
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

const { runT51CorrectiveBenchmark } = loadTsModule(
    path.join(__dirname, 't51CorrectiveBenchmark.ts')
);

console.log('[T5.1] Ejecutando benchmark correctivo F1 (excluir costuras) + F2 (contorno conformal) en 5 configs x 5 arquetipos...');
const t0 = Date.now();
const { report, telemetryBatches, keyframeBundle } = runT51CorrectiveBenchmark();
const elapsedS = ((Date.now() - t0) / 1000).toFixed(2);

fs.writeFileSync(
    path.join(resultsDir, 't51_summary_report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
);
fs.writeFileSync(
    path.join(resultsDir, 't51_keyframe_meshes.json'),
    JSON.stringify(keyframeBundle),
    'utf8'
);

for (const [runId, batch] of Object.entries(telemetryBatches)) {
    fs.writeFileSync(
        path.join(resultsDir, `telemetry_${runId}.json`),
        JSON.stringify(batch),
        'utf8'
    );
}

console.log(`[T5.1] Completado en ${elapsedS} s (${report.runs.length} corridas).`);
console.log('[T5.1] Geometría STEPPED:', JSON.stringify(report.geometries.stepped));
console.log('[T5.1] Geometría CONFORMAL:', JSON.stringify(report.geometries.conformal));
console.log('[T5.1] Scorecards:');
for (const sc of report.scorecards) {
    console.log(
        `  * ${sc.configId} (${sc.contourMode}): t51Pass=${sc.t51CorrectivePassCount}/${sc.runsCount} g1Strict=${sc.gate1StrictPassCount}/${sc.runsCount} | ` +
        `panelEq/Pk=${sc.worstPanelEqMaxStretchPct}%/${sc.worstPanelPeakStretchPct}% combPk=${sc.worstCombinedPeakStretchPct}% | ` +
        `seamEq/Pk=${sc.worstSeamEqMaxGapMm}/${sc.worstSeamTransientPeakGapMm}mm finV=${sc.worstFinalRmsVelMS}m/s | ` +
        `mean=${sc.meanTotalStepMs}ms (w=${sc.worstTotalStepMeanMs}ms, P95=${sc.worstTotalStepP95Ms}ms) col=${sc.meanCollisionMs}ms | ` +
        `gtEq=${sc.worstGtEqSevereFrames}fr (${sc.worstGtEqMaxDepthMm}mm) tex=${sc.textileDifferentiationPass} asym=${sc.asymmetryContrastPass}`
    );
}
console.log('[T5.1] Asimetría:', JSON.stringify(report.asymmetryComparisons));
console.log('[T5.1] Recomendación:', JSON.stringify(report.recommendation, null, 2));

