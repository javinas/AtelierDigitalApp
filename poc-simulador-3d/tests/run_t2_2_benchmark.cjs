/* global __dirname */
// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): EJECUTOR T2.2 (XPBD JERÁRQUICO)
// Archivo: poc-simulador-3d/tests/run_t2_2_benchmark.cjs
// ==============================================================================
// Ejecuta t22HierarchicalBenchmark.ts en aislamiento sin modificar results/t2/
// ni results/t2_1/, exportando todo en poc-simulador-3d/results/t2_2/.
// ==============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const pocRoot = path.resolve(__dirname, '..');
const resultsDir = path.join(pocRoot, 'results', 't2_2');
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

    const localRequire = (specifier) => {
        const resolved = resolveTsFile(path.dirname(normalized), specifier);
        if (resolved) {
            return loadTsModule(resolved);
        }
        return require(specifier);
    };

    const wrapped = `(function(exports, require, module, __filename, __dirname) {\n${transpiled.outputText}\n})`;
    const fn = vm.runInThisContext(wrapped, { filename: normalized });
    fn(mod.exports, localRequire, mod, normalized, path.dirname(normalized));
    return mod.exports;
}

const { runT22BenchmarkSuite } = loadTsModule(path.join(__dirname, 't22HierarchicalBenchmark.ts'));
const { report, batches } = runT22BenchmarkSuite();

const summaryPath = path.join(resultsDir, 't22_benchmark_summary.json');
fs.writeFileSync(summaryPath, JSON.stringify(report, null, 2), 'utf8');

for (const [runId, batch] of Object.entries(batches)) {
    fs.writeFileSync(
        path.join(resultsDir, `${runId}_telemetry.json`),
        JSON.stringify(batch),
        'utf8'
    );
}

console.log(JSON.stringify(report, null, 2));
