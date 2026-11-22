/* global __dirname */
// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): EJECUTOR T2.1 (DIAGNÓSTICO XPBD)
// Archivo: poc-simulador-3d/tests/run_t2_1_diagnostic.cjs
// ==============================================================================
// Ejecuta t21DiagnosticAndVariants.ts sin alterar results/t2/ y escribe todos
// los resultados separados en poc-simulador-3d/results/t2_1/.
// ==============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const pocRoot = path.resolve(__dirname, '..');
const resultsDir = path.join(pocRoot, 'results', 't2_1');
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

const { runT21DiagnosticsAndOptimizations } = loadTsModule(
    path.join(pocRoot, 'tests', 't21DiagnosticAndVariants.ts')
);
const { report, batchesByRunId } = runT21DiagnosticsAndOptimizations();

for (const [runId, batch] of Object.entries(batchesByRunId)) {
    fs.writeFileSync(
        path.join(resultsDir, `${runId}_telemetry.json`),
        JSON.stringify(batch, null, 2),
        'utf8'
    );
}

fs.writeFileSync(
    path.join(resultsDir, 't21_diagnostic_summary.json'),
    JSON.stringify(report, null, 2),
    'utf8'
);

console.log(JSON.stringify(report, null, 2));

