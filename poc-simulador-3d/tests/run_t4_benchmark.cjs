/* global __dirname */
// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): EJECUTOR T4 ARQUETIPOS TEXTILES
// Archivo: poc-simulador-3d/tests/run_t4_benchmark.cjs
// ==============================================================================
// Ejecuta t4TextileArchetypesBenchmark.ts en aislamiento sin modificar
// results/t2/, results/t2_1/, results/t2_2/ ni results/t3/.
// Exporta telemetría JSON y keyframes en poc-simulador-3d/results/t4/.
// ==============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const pocRoot = path.resolve(__dirname, '..');
const resultsDir = path.join(pocRoot, 'results', 't4');
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

const { runT4TextileArchetypesBenchmarkSuite } = loadTsModule(
    path.join(__dirname, 't4TextileArchetypesBenchmark.ts')
);

console.log('[T4] Ejecutando benchmark de arquetipos textiles (TIER_3_ESTIMATED) con H1B + Alt C SDF...');
const t0 = Date.now();
const { report, batches, keyframes } = runT4TextileArchetypesBenchmarkSuite();
const elapsedS = ((Date.now() - t0) / 1000).toFixed(2);

fs.writeFileSync(
    path.join(resultsDir, 't4_summary_report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
);

fs.writeFileSync(
    path.join(resultsDir, 't4_keyframe_meshes.json'),
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

console.log(`[T4] Completado en ${elapsedS} s.`);
console.log('[T4] Veredicto general:', JSON.stringify(report.overallT4Verdict, null, 2));
console.log('[T4] Contrast checks:');
for (const c of report.contrastChecks) {
    console.log(
        `  - ${c.sceneId} [${c.monotonicityMetricName}]: fluido=${c.fluidValue} | medio=${c.mediumValue} | estructurado=${c.structuredValue} | monotonic=${c.strictMonotonicSeparationPass}`
    );
}
console.log('[T4] Asimetría:', JSON.stringify(report.asymmetryCheck));
console.log('[T4] Corridas principales:');
for (const r of report.runs) {
    console.log(
        `  * ${r.runId}: tot=${r.timingMs.totalStepMean}ms (phys=${r.timingMs.physicsStepMean}, col=${r.timingMs.collisionMean}, p95=${r.timingMs.totalStepP95}) | ` +
        `stretchEqMean=${r.clothStrain.equilibriumMeanStretchPct}% peakTrans=${r.clothStrain.transientPeakStretchPct}% peakEq=${r.clothStrain.equilibriumMaxStretchPct}% | ` +
        `gtEqMax=${r.penetrationGroundTruth.equilibriumMaxDepthMm}mm sevFrames=${r.penetrationGroundTruth.equilibriumSevereFramesCount} | ` +
        `NaN=${r.stabilityAndEnergy.nanVertexCountTotal} rmsVel=${r.stabilityAndEnergy.equilibriumRmsVelocityMS} ` +
        `E_kin=${r.stabilityAndEnergy.finalKineticEnergyJ}J E_bend=${r.stabilityAndEnergy.finalBendingEnergyJ}J | ` +
        `t4Func=${r.t4FunctionalPass} gate1Strict=${r.strictGate1AllChecksPass}`
    );
}
console.log('[T4] Sensibilidad:');
for (const s of report.sensitivitySweeps) {
    console.log(
        `  - ${s.sweepGroup} | ${s.label}: tot=${s.totalStepMeanMs}ms | tipDrop=${s.tipDropM} | airGap=${s.subBustAirGapMm} | peakStretch=${s.transientPeakStretchPct}% | E_bend=${s.finalBendingEnergyJ}J`
    );
}

