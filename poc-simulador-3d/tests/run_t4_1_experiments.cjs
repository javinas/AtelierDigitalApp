/* global __dirname */
// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): EJECUTOR T4.1 SOLVER EXPERIMENTS
// Archivo: poc-simulador-3d/tests/run_t4_1_experiments.cjs
// ==============================================================================
// Ejecuta t41SolverExperimentsBenchmark.ts en aislamiento sin modificar
// hierarchicalXpbdSolver.ts ni results/t2/, results/t2_1/, results/t2_2/,
// results/t3/, results/t4/. Exporta resultados en poc-simulador-3d/results/t4_1/.
// ==============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const pocRoot = path.resolve(__dirname, '..');
const resultsDir = path.join(pocRoot, 'results', 't4_1');
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

const { runT41SolverExperimentsBenchmark } = loadTsModule(
    path.join(__dirname, 't41SolverExperimentsBenchmark.ts')
);

console.log('[T4.1] Ejecutando matriz comparativa H1B_ORIGINAL vs EXP1 / EXP2 / EXP3...');
const t0 = Date.now();
const { report, batches } = runT41SolverExperimentsBenchmark();
const elapsedS = ((Date.now() - t0) / 1000).toFixed(2);

fs.writeFileSync(
    path.join(resultsDir, 't41_summary_report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
);

for (const [runId, batch] of Object.entries(batches)) {
    fs.writeFileSync(
        path.join(resultsDir, `telemetry_${runId}.json`),
        JSON.stringify(batch),
        'utf8'
    );
}

console.log(`[T4.1] Completado en ${elapsedS} s (${report.runs.length} corridas).`);
console.log('[T4.1] Scorecards por solver:');
for (const sc of report.scorecards) {
    console.log(
        `  * ${sc.solverId}: PASS=${sc.strictPassCount}/${sc.totalRuns} (${sc.strictPassRatePct}%) | ` +
        `micro=${sc.microMeshPass}(${sc.microMeshPeakStretchPct}%) scene0=${sc.scene0Pass} ` +
        `gathered=${sc.gatheredPassCount}/2 bodice=${sc.bodicePassCount}/4 ` +
        `shAnch=${sc.shoulderAnchoredPassCount}/2 sh0Pin=${sc.shoulderCape0PinPassCount}/2 | ` +
        `asym=${sc.asymmetryDirectionalPass} worstMean=${sc.worstTotalStepMeanMs}ms worstP95=${sc.worstTotalStepP95Ms}ms`
    );
}
console.log('[T4.1] Asimetría direccional:', JSON.stringify(report.asymmetryBySolver));
console.log('[T4.1] Recomendación:', JSON.stringify(report.recommendation, null, 2));

