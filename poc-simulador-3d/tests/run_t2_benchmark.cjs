/* global __dirname */
// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): EJECUTOR NODE T2 (XPBD VS. PBD)
// Archivo: poc-simulador-3d/tests/run_t2_benchmark.cjs
// ==============================================================================
// Ejecuta t2ExperimentRunner.ts en memoria, guarda los JSON por frame en
// poc-simulador-3d/results/t2/ y escribe un resumen tabular para auditoría.
// ==============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const pocRoot = path.resolve(__dirname, '..');
const resultsDir = path.join(pocRoot, 'results', 't2');
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

    const localDir = path.dirname(normalized);
    const customRequire = (specifier) => {
        const resolved = resolveTsFile(localDir, specifier);
        if (resolved) {
            return loadTsModule(resolved);
        }
        return require(specifier);
    };

    const wrapped = `(function(exports, require, module, __filename, __dirname) {\n${transpiled.outputText}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: normalized });
    fn(mod.exports, customRequire, mod, normalized, localDir);
    return mod.exports;
}

const { runT2ComparativeBenchmark } = loadTsModule(path.join(pocRoot, 'tests', 't2ExperimentRunner.ts'));
const result = runT2ComparativeBenchmark();

const keyframeBundle = {};
for (const run of result.runs) {
    const telemetryPath = path.join(resultsDir, `${run.summary.runId}_telemetry.json`);
    fs.writeFileSync(telemetryPath, JSON.stringify(run.telemetryBatch, null, 2), 'utf8');
    keyframeBundle[run.summary.runId] = {
        summary: run.summary,
        gridSize: run.gridSize,
        triangleIndices: run.triangleIndices,
        restPositionsM: run.restPositionsM,
        keyframes: run.keyframes,
    };
}

fs.writeFileSync(
    path.join(resultsDir, 't2_keyframe_meshes.json'),
    JSON.stringify(keyframeBundle),
    'utf8'
);

const summaryPayload = {
    generatedAtIso: new Date().toISOString(),
    gradientVerificationMaxError: result.gradientVerificationMaxError,
    parametersNote: result.parametersNote,
    runs: result.runs.map((r) => r.summary),
    invariance: result.invariance,
};

fs.writeFileSync(
    path.join(resultsDir, 't2_comparison_summary.json'),
    JSON.stringify(summaryPayload, null, 2),
    'utf8'
);

console.log(JSON.stringify(summaryPayload, null, 2));

