/* global __dirname */
// ==============================================================================
// ATELIER DIGITAL — PoC ETAPA 1 (AISLADA): EJECUTOR BENCHMARK CORRECTIVO T5.2
// Archivo: poc-simulador-3d/tests/run_t5_2_benchmark.cjs
// ==============================================================================

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ts = require('typescript');

const pocRoot = path.resolve(__dirname, '..');
const resultsDir = path.join(pocRoot, 'results', 't5_2');
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

const { runT52CorrectiveBenchmark } = loadTsModule(
    path.join(__dirname, 't52CorrectiveBenchmark.ts')
);

console.log('[T5.2] Ejecutando benchmark correctivo T5.2 (5 configs x 5 arquetipos = 25 corridas @ 5.0 s)...');
const t0 = Date.now();
const { report, telemetryBatches, keyframeBundle } = runT52CorrectiveBenchmark();
const elapsedS = ((Date.now() - t0) / 1000).toFixed(2);

fs.writeFileSync(
    path.join(resultsDir, 't52_summary_report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
);
fs.writeFileSync(
    path.join(resultsDir, 't52_keyframe_meshes.json'),
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

console.log(`[T5.2] Completado en ${elapsedS} s. Archivos en ${resultsDir}`);
console.log('[T5.2] Geometría BASE vs REGULARIZED:');
for (const key of ['conformal_base', 'conformal_regularized']) {
    const g = report.geometries[key];
    console.log(
        `  - ${key}: minEdge=${g.qualityStats.minPanelEdgeLenMm}mm | minAng=${g.qualityStats.minAngleDeg}deg | ` +
        `tris<12°=${g.trianglesBelow12DegCount} | max|L2d-L0|=${g.maxAbsPattern2dVsXpbdRestLenMm}mm | ` +
        `pre>=5%=${g.initial3dPreStrain.edgesGe5PctCount} (max=${g.initial3dPreStrain.maxPreStrainPct}%, min=${g.initial3dPreStrain.minPreStrainPct}%) | ` +
        `massMin=${g.nodalMassStats.minMassG}g (ratio=${g.nodalMassStats.maxToMinRatio})`
    );
}
console.log('[T5.2] Scorecards SIN RAMPA:');
for (const c of report.scorecardsWithoutRamp) {
    console.log(
        `  - ${c.configId}: Gate1=${c.gate1StrictPassCount}/5 | panelEqMeanMax=${c.worstPanelMeanEqPct}% | ` +
        `panelPk=${c.worstPanelPeakStretchPct}% | panelEqMax=${c.worstPanelEqMaxStretchPct}% | ` +
        `combPk=${c.worstCombinedPeakStretchPct}% | seamEq/Pk=${c.worstSeamEqMaxGapMm}/${c.worstSeamTransientPeakGapMm}mm | ` +
        `rmsVel=${c.worstFinalRmsVelMS}m/s | CPU=${c.meanTotalStepMs}ms (P95=${c.worstTotalStepP95Ms}ms) | GT eq>3mm=${c.worstGtEqSevereFrames}`
    );
}
console.log('[T5.2] Scorecards CON RAMPA 10 FRAMES:');
for (const c of report.scorecardsWithRamp10) {
    console.log(
        `  - ${c.configId}: Gate1=${c.gate1StrictPassCount}/5 | panelEqMeanMax=${c.worstPanelMeanEqPct}% | ` +
        `panelPk=${c.worstPanelPeakStretchPct}% | panelEqMax=${c.worstPanelEqMaxStretchPct}% | ` +
        `combPk=${c.worstCombinedPeakStretchPct}% | seamEq/Pk=${c.worstSeamEqMaxGapMm}/${c.worstSeamTransientPeakGapMm}mm | ` +
        `rmsVel=${c.worstFinalRmsVelMS}m/s | CPU=${c.meanTotalStepMs}ms (P95=${c.worstTotalStepP95Ms}ms) | GT eq>3mm=${c.worstGtEqSevereFrames}`
    );
}
console.log(`[T5.2] Mejor sin rampa=${report.recommendation.bestWithoutRampId} | Mejor con rampa=${report.recommendation.bestWithRamp10Id} | Gate1=${report.recommendation.gate1Approved}`);

