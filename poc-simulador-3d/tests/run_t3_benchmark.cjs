/* global __dirname */
// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): EJECUTOR T3 COLISIÓN CORPORAL
// Archivo: poc-simulador-3d/tests/run_t3_benchmark.cjs
// ==============================================================================
// Ejecuta t3CollisionBenchmark.ts en aislamiento sin modificar results/t2/,
// results/t2_1/ ni results/t2_2/. Exporta resultados en poc-simulador-3d/results/t3/.
// ==============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const pocRoot = path.resolve(__dirname, '..');
const resultsDir = path.join(pocRoot, 'results', 't3');
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

    const fn = new vm.Script(transpiled.outputText, { filename: normalized }).runInThisContext;
    if (typeof fn === 'function') {
        const wrapped = vm.runInThisContext(
            `(function(exports, require, module, __filename, __dirname) {\n${transpiled.outputText}\n})`,
            { filename: normalized }
        );
        wrapped(mod.exports, localRequire, mod, normalized, dir);
    }

    return mod.exports;
}

const { runT3CollisionBenchmarkSuite } = loadTsModule(path.join(__dirname, 't3CollisionBenchmark.ts'));

console.log('[T3] Ejecutando benchmark comparativo A vs B vs C con solver H1B_VCYCLE_12SUB...');
const t0 = Date.now();
const { report, batches, keyframes } = runT3CollisionBenchmarkSuite();
const elapsedS = ((Date.now() - t0) / 1000).toFixed(2);

fs.writeFileSync(
    path.join(resultsDir, 't3_summary_report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
);

fs.writeFileSync(
    path.join(resultsDir, 't3_keyframe_meshes.json'),
    JSON.stringify(keyframes),
    'utf8'
);

for (const [runId, batch] of Object.entries(batches)) {
    fs.writeFileSync(
        path.join(resultsDir, `telemetry_${runId}.json`),
        JSON.stringify(batch),
        'utf8'
    );
}

console.log(`[T3] Benchmark completado en ${elapsedS}s.`);
console.log('\n--- PRECISIÓN ESTÁTICA DEL PROXY VS TORSO CANÓNICO (96x108) ---');
for (const acc of report.proxyAccuracyComparison) {
    console.log(
        `${acc.alternativeId.padEnd(27)} | init=${acc.initMs.toFixed(1).padStart(6)}ms | `
        + `mem=${(acc.memoryFootprintBytes / 1024).toFixed(1).padStart(7)}KB | `
        + `MAE=${acc.meanAbsErrorMm.toFixed(2)}mm | MaxErr=${acc.maxAbsErrorMm.toFixed(2)}mm`
    );
}

console.log('\n--- RESULTADOS POR ESCENA Y ALTERNATIVA ---');
for (const r of report.runs) {
    const verdict = r.allGate1ChecksPass ? 'PASS' : 'FAIL';
    console.log(
        `[${verdict}] ${r.sceneId} / ${r.alternativeId} | `
        + `col=${r.timingMs.collisionMean.toFixed(2)}ms (p95 ${r.timingMs.collisionP95.toFixed(2)}) | `
        + `phys=${r.timingMs.physicsStepMean.toFixed(2)}ms | `
        + `tot=${r.timingMs.totalStepMean.toFixed(2)}ms (p95 ${r.timingMs.totalStepP95.toFixed(2)}) | `
        + `gtEqMaxPen=${r.penetrationGroundTruth.equilibriumMaxDepthMm.toFixed(2)}mm (frames>3mm: ${r.penetrationGroundTruth.equilibriumSevereFramesCount}) | `
        + `gtAllMaxPen=${r.penetrationGroundTruth.maxDepthAllFramesMm.toFixed(2)}mm | `
        + `proxyEqPen=${r.penetrationProxySelfReported.equilibriumMaxDepthMm.toFixed(2)}mm | `
        + `peakStretch=${r.clothPhysics.transientPeakStretchPct.toFixed(2)}% | `
        + `eqStretch=${r.clothPhysics.equilibriumMeanStretchPct.toFixed(2)}%/${r.clothPhysics.equilibriumMaxStretchPct.toFixed(2)}% | `
        + `NaN=${r.nanVertexCountTotal} | sd0=${r.clothPhysics.minSignedDistanceInitialM.toFixed(4)}m`
    );
}

console.log('\n--- ROLLUP POR ALTERNATIVA ---');
for (const ro of report.alternativeRollup) {
    console.log(
        `${ro.alternativeId.padEnd(27)} -> ${ro.overallPass ? 'PASS' : 'FAIL'} (${ro.scenesPassedCount}/${ro.scenesTotalCount}) | `
        + `worstCol=${ro.worstCollisionMeanMs}ms | worstTot=${ro.worstTotalStepMeanMs}ms (p95=${ro.worstTotalStepP95Ms}ms) | `
        + `worstGtEqPen=${ro.worstGtEquilibriumPenetrationMm}mm | worstPeakStretch=${ro.worstPeakStretchPct}%`
    );
}

