/* global __dirname */
// ==============================================================================
// POC COMPARATIVA CONTROLADA: OpenAI vs. Google Gemini (AI Haute Couture)
// Archivo: poc-ai-haute-couture-comparison/run_comparison.cjs
// ==============================================================================
// Runner aislado dentro de `poc-ai-haute-couture-comparison/`.
// NO modifica archivos fuera de este directorio. NO inventa precios ni resultados.
// Si falta alguna API Key, valida entradas, genera el preflight y se detiene.
// ==============================================================================

const fs = require('fs');
const path = require('path');
const { Buffer } = require('node:buffer');
const { generateAllReferenceInputs, auditGeneratedSilhouettePng } = require('./generate_reference_inputs.cjs');

const POC_ROOT = __dirname;
const RESULTS_DIR = path.join(POC_ROOT, 'results');

function loadLocalEnvFile(filePath, targetEnv) {
    if (!fs.existsSync(filePath)) return false;
    const raw = fs.readFileSync(filePath, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx <= 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let val = trimmed.slice(eqIdx + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
            val = val.slice(1, -1);
        }
        if (!targetEnv[key] && val) {
            targetEnv[key] = val;
        }
    }
    return true;
}

function loadIsolatedConfig() {
    const cfg = { ...process.env };
    const loadedEnv = loadLocalEnvFile(path.join(POC_ROOT, '.env'), cfg);
    const loadedLocal = loadLocalEnvFile(path.join(POC_ROOT, '.env.local'), cfg);
    return {
        cfg,
        envSources: {
            pocDotEnvFound: loadedEnv,
            pocDotEnvLocalFound: loadedLocal,
        },
    };
}

function parseModelCandidates(primary, fallbackCsv) {
    const out = [];
    if (primary && primary.trim()) out.push(primary.trim());
    if (fallbackCsv && fallbackCsv.trim()) {
        for (const item of fallbackCsv.split(',')) {
            const clean = item.trim();
            if (clean && !out.includes(clean)) out.push(clean);
        }
    }
    return out;
}

function parseOptionalNumber(val) {
    if (val === undefined || val === null || String(val).trim() === '') return null;
    const n = Number(val);
    return Number.isFinite(n) && n >= 0 ? n : null;
}

async function fetchJsonWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const t0 = Date.now();
    try {
        const res = await fetch(url, { ...options, signal: controller.signal });
        const elapsedMs = Date.now() - t0;
        const text = await res.text();
        let json = null;
        try {
            json = JSON.parse(text);
        } catch {
            json = { rawText: text };
        }
        return { ok: res.ok, status: res.status, elapsedMs, json };
    } finally {
        clearTimeout(timer);
    }
}

class ProviderExecutionError extends Error {
    constructor(message, details = {}) {
        super(message);
        this.name = 'ProviderExecutionError';
        this.httpStatus = details.httpStatus ?? null;
        this.model = details.model ?? null;
        this.endpoint = details.endpoint ?? null;
        this.elapsedMs = details.elapsedMs ?? 0;
        this.attemptedModels = details.attemptedModels || [];
    }
}

function pickFirstAvailable(candidates, availableSet) {
    const available = candidates.filter((id) => availableSet.has(id));
    return {
        selectedModel: available[0] || null,
        matchedPrimary: available.length > 0 && available[0] === candidates[0],
        candidatesChecked: candidates,
        availableCandidates: available,
    };
}

async function checkOpenAiModels(apiKey, researchCandidates, imageCandidates, timeoutMs) {
    const res = await fetchJsonWithTimeout(
        'https://api.openai.com/v1/models',
        {
            method: 'GET',
            headers: { Authorization: `Bearer ${apiKey}` },
        },
        timeoutMs
    );
    if (!res.ok) {
        return {
            ok: false,
            status: res.status,
            elapsedMs: res.elapsedMs,
            error: res.json?.error?.message || `HTTP ${res.status}`,
            availableIds: [],
        };
    }
    const availableIds = Array.isArray(res.json?.data) ? res.json.data.map((m) => m.id) : [];
    const availableSet = new Set(availableIds);
    return {
        ok: true,
        status: res.status,
        elapsedMs: res.elapsedMs,
        totalAccountModels: availableIds.length,
        researchResolution: pickFirstAvailable(researchCandidates, availableSet),
        imageResolution: pickFirstAvailable(imageCandidates, availableSet),
    };
}

async function checkGeminiModels(apiKey, researchCandidates, imageCandidates, timeoutMs) {
    const res = await fetchJsonWithTimeout(
        'https://generativelanguage.googleapis.com/v1beta/models?pageSize=200',
        {
            method: 'GET',
            headers: { 'x-goog-api-key': apiKey },
        },
        timeoutMs
    );
    if (!res.ok) {
        return {
            ok: false,
            status: res.status,
            elapsedMs: res.elapsedMs,
            error: res.json?.error?.message || `HTTP ${res.status}`,
            availableIds: [],
        };
    }
    const rawModels = Array.isArray(res.json?.models) ? res.json.models : [];
    const availableIds = rawModels
        .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes('generateContent'))
        .map((m) => String(m.name || '').replace(/^models\//, ''));
    const availableSet = new Set(availableIds);
    return {
        ok: true,
        status: res.status,
        elapsedMs: res.elapsedMs,
        totalAccountModels: availableIds.length,
        researchResolution: pickFirstAvailable(researchCandidates, availableSet),
        imageResolution: pickFirstAvailable(imageCandidates, availableSet),
    };
}

function computeTokenCostUsd(inputTokens, outputTokens, inRatePer1M, outRatePer1M) {
    if (inRatePer1M === null || outRatePer1M === null) {
        return { costUsd: null, pricingSource: 'TARIFA_NO_CONFIGURADA_EN_ENV' };
    }
    const inCost = ((inputTokens || 0) / 1_000_000) * inRatePer1M;
    const outCost = ((outputTokens || 0) / 1_000_000) * outRatePer1M;
    return {
        costUsd: Math.round((inCost + outCost) * 1_000_000) / 1_000_000,
        pricingSource: 'CONFIGURED_ENV_TARIFF',
    };
}

function computeImageCostUsd(usage, unitRateUsd, inRatePer1M, outRatePer1M) {
    if (unitRateUsd !== null) {
        return { costUsd: Math.round(unitRateUsd * 1_000_000) / 1_000_000, pricingSource: 'CONFIGURED_ENV_UNIT_TARIFF' };
    }
    if (inRatePer1M !== null && outRatePer1M !== null && usage) {
        return computeTokenCostUsd(usage.inputTokens, usage.outputTokens, inRatePer1M, outRatePer1M);
    }
    return { costUsd: null, pricingSource: 'TARIFA_NO_CONFIGURADA_EN_ENV' };
}

// ==============================================================================
// FASE 1: INVESTIGACIÓN TÉCNICA DOCUMENTADA CON FUENTES
// ==============================================================================

async function runOpenAiResearch(apiKey, candidates, promptText, rates, timeoutMs) {
    const modelList = Array.isArray(candidates) ? candidates : [candidates];
    const attemptedModels = [];
    let totalElapsedMs = 0;

    for (const model of modelList) {
        const body = {
            model,
            tools: [{ type: 'web_search' }],
            input: promptText,
        };
        const res = await fetchJsonWithTimeout(
            'https://api.openai.com/v1/responses',
            {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            },
            timeoutMs
        );
        totalElapsedMs += res.elapsedMs;

        if (!res.ok) {
            const msg = res.json?.error?.message || JSON.stringify(res.json);
            attemptedModels.push({ model, httpStatus: res.status, elapsedMs: res.elapsedMs, error: msg });
            if (res.status === 404 || res.status === 503) {
                continue;
            }
            throw new ProviderExecutionError(`OpenAI Research HTTP ${res.status}: ${msg}`, {
                httpStatus: res.status,
                model,
                endpoint: 'POST /v1/responses (web_search)',
                elapsedMs: totalElapsedMs,
                attemptedModels,
            });
        }

        const citations = [];
        const seenUrls = new Set();
        const textChunks = [];
        for (const item of res.json?.output || []) {
            if (item.type === 'message' && Array.isArray(item.content)) {
                for (const part of item.content) {
                    if (part.type === 'output_text') {
                        textChunks.push(part.text || '');
                        for (const ann of part.annotations || []) {
                            if (ann.type === 'url_citation' && ann.url && !seenUrls.has(ann.url)) {
                                seenUrls.add(ann.url);
                                let domain = '';
                                try { domain = new URL(ann.url).hostname; } catch { /* noop */ }
                                citations.push({ url: ann.url, title: ann.title || ann.url, domain });
                            }
                        }
                    }
                }
            }
        }

        const usageRaw = res.json?.usage || {};
        const inputTokens = usageRaw.input_tokens ?? 0;
        const outputTokens = usageRaw.output_tokens ?? 0;
        const cost = computeTokenCostUsd(inputTokens, outputTokens, rates.inRate, rates.outRate);

        attemptedModels.push({ model, httpStatus: res.status, elapsedMs: res.elapsedMs });
        return {
            status: 'OK',
            httpStatus: res.status,
            provider: 'openai',
            model,
            endpoint: 'POST /v1/responses (web_search)',
            elapsedMs: res.elapsedMs,
            attemptedModels,
            groundingNote: null,
            reportMarkdown: textChunks.join('\n\n') || res.json?.output_text || '',
            citations,
            usage: {
                inputTokens,
                outputTokens,
                totalTokens: usageRaw.total_tokens ?? inputTokens + outputTokens,
                raw: usageRaw,
            },
            ...cost,
        };
    }

    const last = attemptedModels[attemptedModels.length - 1] || {};
    throw new ProviderExecutionError(`OpenAI Research falló en todos los candidatos (${last.httpStatus || 'unknown'}): ${last.error || 'sin detalle'}`, {
        httpStatus: last.httpStatus ?? null,
        model: last.model ?? modelList[0] ?? null,
        endpoint: 'POST /v1/responses (web_search)',
        elapsedMs: totalElapsedMs,
        attemptedModels,
    });
}

async function callGeminiResearchOnce(apiKey, model, promptText, timeoutMs) {
    const body = {
        contents: [{ role: 'user', parts: [{ text: promptText }] }],
        tools: [{ googleSearch: {} }],
    };
    return fetchJsonWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
            method: 'POST',
            headers: {
                'x-goog-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        },
        timeoutMs
    );
}

async function runGeminiResearch(apiKey, candidates, promptText, rates, timeoutMs) {
    const modelList = Array.isArray(candidates) ? candidates : [candidates];
    const attemptedModels = [];
    let totalElapsedMs = 0;

    const extractAndReturn = (res, model) => {
        const cand = (res.json?.candidates || [])[0] || {};
        const parts = cand?.content?.parts || [];
        const reportMarkdown = parts.map((p) => p.text).filter(Boolean).join('\n\n');
        const citations = [];
        const seenUrls = new Set();
        const gm = cand?.groundingMetadata || {};
        for (const chunk of gm.groundingChunks || []) {
            const uri = chunk?.web?.uri;
            if (uri && !seenUrls.has(uri)) {
                seenUrls.add(uri);
                let domain = '';
                try { domain = new URL(uri).hostname; } catch { /* noop */ }
                citations.push({
                    url: uri,
                    title: chunk?.web?.title || uri,
                    domain,
                });
            }
        }
        const um = res.json?.usageMetadata || {};
        const inputTokens = um.promptTokenCount ?? 0;
        const outputTokens = um.candidatesTokenCount ?? 0;
        const cost = computeTokenCostUsd(inputTokens, outputTokens, rates.inRate, rates.outRate);
        return {
            status: 'OK',
            httpStatus: res.status,
            provider: 'gemini',
            model,
            endpoint: `POST /v1beta/models/${model}:generateContent (googleSearch)`,
            elapsedMs: res.elapsedMs,
            attemptedModels,
            groundingNote: null,
            reportMarkdown,
            citations,
            usage: {
                inputTokens,
                outputTokens,
                thoughtsTokenCount: um.thoughtsTokenCount ?? 0,
                totalTokens: um.totalTokenCount ?? inputTokens + outputTokens,
                raw: um,
            },
            ...cost,
        };
    };

    // Ejecución obligatoria con grounding web googleSearch (sin fallback sin búsqueda)
    for (const model of modelList) {
        const res = await callGeminiResearchOnce(apiKey, model, promptText, timeoutMs);
        totalElapsedMs += res.elapsedMs;
        if (res.ok) {
            const parsed = extractAndReturn(res, model);
            if (parsed.reportMarkdown.trim()) {
                attemptedModels.push({ model, withGoogleSearch: true, httpStatus: res.status, elapsedMs: res.elapsedMs });
                return parsed;
            }
            attemptedModels.push({ model, withGoogleSearch: true, httpStatus: res.status, elapsedMs: res.elapsedMs, error: 'Respuesta vacía del modelo' });
            continue;
        }
        const msg = res.json?.error?.message || JSON.stringify(res.json);
        attemptedModels.push({ model, withGoogleSearch: true, httpStatus: res.status, elapsedMs: res.elapsedMs, error: msg });
        if (res.status === 404 || res.status === 503) {
            continue;
        }
        throw new ProviderExecutionError(`Gemini Research HTTP ${res.status} (googleSearch): ${msg}`, {
            httpStatus: res.status,
            model,
            endpoint: `POST /v1beta/models/${model}:generateContent (googleSearch)`,
            elapsedMs: totalElapsedMs,
            attemptedModels,
        });
    }

    const last = attemptedModels[attemptedModels.length - 1] || {};
    throw new ProviderExecutionError(`Gemini Research HTTP ${last.httpStatus || 'unknown'} (googleSearch): ${last.error || 'sin detalle'}`, {
        httpStatus: last.httpStatus ?? null,
        model: last.model ?? modelList[0] ?? null,
        endpoint: `POST /v1beta/models/${last.model || modelList[0] || ''}:generateContent (googleSearch)`,
        elapsedMs: totalElapsedMs,
        attemptedModels,
    });
}

// ==============================================================================
// FASES 2 Y 3: GENERACIÓN VISUAL INICIAL (v1) Y MODIFICACIÓN CONVERSACIONAL (v2)
// ==============================================================================

const OPENAI_LOCKED_IMAGE_MODEL = 'gpt-image-2.6-sunburst';
const GEMINI_LOCKED_IMAGE_MODEL = 'gemini-3-pro-image';

async function runOpenAiImageEdit({
    apiKey,
    model,
    imageBuffersWithNames,
    prompt,
    size,
    quality,
    rates,
    timeoutMs,
}) {
    if (model !== OPENAI_LOCKED_IMAGE_MODEL) {
        throw new ProviderExecutionError(`Modelo de imagen OpenAI bloqueado a '${OPENAI_LOCKED_IMAGE_MODEL}', recibido '${model}'.`, {
            httpStatus: null,
            model,
            endpoint: 'POST /v1/images/edits',
            elapsedMs: 0,
            attemptedModels: [{ model, httpStatus: null, elapsedMs: 0, error: 'Modelo distinto al bloqueado' }],
        });
    }

    const fieldName = imageBuffersWithNames.length > 1 ? 'image[]' : 'image';
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', prompt);
    form.append('size', size);
    form.append('quality', quality);
    form.append('output_format', 'png');

    for (const item of imageBuffersWithNames) {
        const blob = new Blob([item.buffer], { type: 'image/png' });
        form.append(fieldName, blob, item.filename);
    }

    const res = await fetchJsonWithTimeout(
        'https://api.openai.com/v1/images/edits',
        {
            method: 'POST',
            headers: { Authorization: `Bearer ${apiKey}` },
            body: form,
        },
        timeoutMs
    );

    if (!res.ok) {
        const msg = res.json?.error?.message || JSON.stringify(res.json);
        throw new ProviderExecutionError(`OpenAI Image Edit HTTP ${res.status}: ${msg}`, {
            httpStatus: res.status,
            model,
            endpoint: 'POST /v1/images/edits',
            elapsedMs: res.elapsedMs,
            attemptedModels: [{ model, httpStatus: res.status, elapsedMs: res.elapsedMs, error: msg }],
        });
    }

    const imgEntry = (res.json?.data || [])[0];
    if (!imgEntry?.b64_json) {
        throw new ProviderExecutionError('OpenAI Image API no devolvió b64_json en data[0].', {
            httpStatus: res.status,
            model,
            endpoint: 'POST /v1/images/edits',
            elapsedMs: res.elapsedMs,
            attemptedModels: [{ model, httpStatus: res.status, elapsedMs: res.elapsedMs, error: 'Sin b64_json en data[0]' }],
        });
    }

    const pngBuffer = Buffer.from(imgEntry.b64_json, 'base64');
    const usageRaw = res.json?.usage || {};
    const usageNormalized = {
        inputTokens: usageRaw.input_tokens ?? 0,
        outputTokens: usageRaw.output_tokens ?? 0,
        totalTokens: usageRaw.total_tokens ?? 0,
        raw: usageRaw,
    };
    const cost = computeImageCostUsd(usageNormalized, rates.unitUsd, rates.imgInRate, rates.imgOutRate);

    return {
        status: 'OK',
        httpStatus: res.status,
        provider: 'openai',
        model,
        endpoint: 'POST /v1/images/edits',
        elapsedMs: res.elapsedMs,
        attemptedModels: [{ model, httpStatus: res.status, elapsedMs: res.elapsedMs }],
        pngBuffer,
        mimeType: 'image/png',
        usage: usageNormalized,
        ...cost,
    };
}

async function runGeminiImageGenerate({
    apiKey,
    model,
    imageBuffersWithLabels,
    prompt,
    aspectRatio,
    geminiImageSize,
    rates,
    timeoutMs,
}) {
    if (model !== GEMINI_LOCKED_IMAGE_MODEL) {
        throw new ProviderExecutionError(`Modelo de imagen Gemini bloqueado a '${GEMINI_LOCKED_IMAGE_MODEL}', recibido '${model}'.`, {
            httpStatus: null,
            model,
            endpoint: `POST /v1beta/models/${model}:generateContent`,
            elapsedMs: 0,
            attemptedModels: [{ model, httpStatus: null, elapsedMs: 0, error: 'Modelo distinto al bloqueado' }],
        });
    }

    const parts = [{ text: prompt }];
    for (const item of imageBuffersWithLabels) {
        parts.push({
            inlineData: {
                mimeType: 'image/png',
                data: item.buffer.toString('base64'),
            },
        });
    }

    const body = {
        contents: [{ role: 'user', parts }],
        generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
                aspectRatio,
                imageSize: geminiImageSize,
            },
        },
    };

    const endpoint = `POST /v1beta/models/${model}:generateContent (aspectRatio=${aspectRatio}, imageSize=${geminiImageSize})`;
    const res = await fetchJsonWithTimeout(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
            method: 'POST',
            headers: {
                'x-goog-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(body),
        },
        timeoutMs
    );

    if (!res.ok) {
        const msg = res.json?.error?.message || JSON.stringify(res.json);
        throw new ProviderExecutionError(`Gemini Image HTTP ${res.status}: ${msg}`, {
            httpStatus: res.status,
            model,
            endpoint,
            elapsedMs: res.elapsedMs,
            attemptedModels: [{ model, httpStatus: res.status, elapsedMs: res.elapsedMs, error: msg }],
        });
    }

    const cand = (res.json?.candidates || [])[0] || {};
    const outParts = cand?.content?.parts || [];
    let imagePart = null;
    const companionTexts = [];
    for (const p of outParts) {
        if (p.inlineData?.data && String(p.inlineData.mimeType || '').startsWith('image/')) {
            imagePart = p.inlineData;
        } else if (p.text) {
            companionTexts.push(p.text);
        }
    }

    if (!imagePart) {
        const msg = `Gemini no devolvió imagen inlineData. FinishReason=${cand?.finishReason || 'unknown'}`;
        throw new ProviderExecutionError(msg, {
            httpStatus: res.status,
            model,
            endpoint,
            elapsedMs: res.elapsedMs,
            attemptedModels: [{ model, httpStatus: res.status, elapsedMs: res.elapsedMs, error: msg }],
        });
    }

    const imageBuffer = Buffer.from(imagePart.data, 'base64');
    const um = res.json?.usageMetadata || {};
    const usageNormalized = {
        inputTokens: um.promptTokenCount ?? 0,
        outputTokens: um.candidatesTokenCount ?? 0,
        totalTokens: um.totalTokenCount ?? 0,
        raw: um,
    };
    const cost = computeImageCostUsd(usageNormalized, rates.unitUsd, rates.imgInRate, rates.imgOutRate);

    return {
        status: 'OK',
        httpStatus: res.status,
        provider: 'gemini',
        model,
        endpoint,
        elapsedMs: res.elapsedMs,
        attemptedModels: [{ model, httpStatus: res.status, elapsedMs: res.elapsedMs }],
        imageBuffer,
        mimeType: imagePart.mimeType,
        companionText: companionTexts.join('\n'),
        usage: usageNormalized,
        ...cost,
    };
}

function tryAuditImageBuffer(buf, mimeType) {
    if (mimeType !== 'image/png') {
        return {
            audited: false,
            reason: `El proveedor devolvió formato '${mimeType}' en lugar de PNG; se omite auditoría binaria PNG directa.`,
        };
    }
    try {
        const result = auditGeneratedSilhouettePng(buf);
        return { audited: true, ...result };
    } catch (err) {
        return { audited: false, reason: err.message };
    }
}

async function executePhaseSafely(fn, fallbackMeta) {
    try {
        return await fn();
    } catch (err) {
        return {
            status: 'ERROR',
            httpStatus: err.httpStatus ?? null,
            errorMessage: err.message,
            attemptedModels: err.attemptedModels || [],
            provider: fallbackMeta.provider,
            model: err.model || fallbackMeta.model || null,
            endpoint: err.endpoint || fallbackMeta.endpoint || null,
            elapsedMs: err.elapsedMs ?? 0,
            citations: [],
            groundingNote: null,
            reportMarkdown: '',
            usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
            costUsd: null,
            pricingSource: 'NO_EJECUTADO_POR_ERROR',
        };
    }
}

function buildResearchMarkdownDoc(providerTitle, res) {
    if (res.status !== 'OK') {
        const attempts = (res.attemptedModels || [])
            .map((a) => `- \`${a.model}\`${a.withGoogleSearch !== undefined ? ` (googleSearch=${a.withGoogleSearch})` : ''}: HTTP ${a.httpStatus} — ${a.error || 'error'}`)
            .join('\n');
        return `# Investigación Técnica ${providerTitle} — BLOQUEADA (${res.status})\n\n` +
            `- **HTTP Status:** ${res.httpStatus ?? 'N/D'}\n` +
            `- **Modelo:** \`${res.model || 'N/D'}\`\n` +
            `- **Endpoint:** \`${res.endpoint || 'N/D'}\`\n` +
            `- **Error exacto:** ${res.errorMessage}\n\n` +
            `## Intentos registrados\n${attempts || '- Sin intentos adicionales.'}\n`;
    }
    const noteBlock = res.groundingNote ? `> **Nota de grounding:** ${res.groundingNote}\n\n` : '';
    const citesBlock = res.citations.length > 0
        ? res.citations.map((c, i) => `${i + 1}. [${c.title}](${c.url}) (${c.domain})`).join('\n')
        : `- Sin citas web externas registradas (${res.groundingNote || 'el proveedor no devolvió grounding chunks'}).`;

    return `# Investigación Técnica ${providerTitle} (${res.model})\n\n` +
        `- **Endpoint:** \`${res.endpoint}\`\n` +
        `- **Tiempo:** ${res.elapsedMs} ms\n` +
        `- **Tokens (in / out / total):** ${res.usage.inputTokens} / ${res.usage.outputTokens} / ${res.usage.totalTokens}\n\n` +
        noteBlock +
        `${res.reportMarkdown}\n\n## Fuentes Citadas\n${citesBlock}\n`;
}

function formatComparisonMarkdown(summary) {
    const fmtCost = (val) => (val === null || val === undefined ? 'N/D (tarifa no configurada)' : `$${Number(val).toFixed(4)} USD`);
    const fmtAudit = (a) => (a && a.audited ? `${a.verdict} (máx desv. ${a.maxDeviationPct}%)` : `No auditado (${a?.reason || 'N/A'})`);
    const fmtResearchCell = (r) => (r.status === 'OK'
        ? `OK · ${r.citations.length} citas`
        : `ERROR HTTP ${r.httpStatus ?? 'N/A'}`);
    const fmtImageLinkOrError = (provider, fileSlug, stageObj) => {
        if (stageObj.status === 'OK' && stageObj.ext) {
            return `[results/${fileSlug}.${stageObj.ext}](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-ai-haute-couture-comparison/results/${fileSlug}.${stageObj.ext})`;
        }
        return `**${stageObj.status}** (HTTP ${stageObj.httpStatus ?? 'N/A'}): ${stageObj.errorMessage}`;
    };

    const oR = summary.providers.openai.research;
    const gR = summary.providers.gemini.research;
    const oV1 = summary.providers.openai.v1;
    const gV1 = summary.providers.gemini.v1;
    const oV2 = summary.providers.openai.v2;
    const gV2 = summary.providers.gemini.v2;

    const statusBanner = summary.status === 'COMPLETED'
        ? '**Estado global:** `COMPLETED` (todas las fases de ambos proveedores completadas sin simulación).'
        : `**Estado global:** \`${summary.status}\` — Al menos una fase fue bloqueada por cuota/facturación del proveedor (HTTP 429). **No se simularon ni inventaron imágenes, latencias ni costos.**`;

    const geminiExcerpt = gR.status === 'OK' && gR.reportPreview
        ? `\n### Extracto real obtenido de Gemini (\`${gR.model}\`)\n${gR.groundingNote ? `> ${gR.groundingNote}\n\n` : ''}${gR.reportPreview}\n`
        : '';
    const openaiExcerpt = oR.status === 'OK' && oR.reportPreview
        ? `\n### Extracto real obtenido de OpenAI (\`${oR.model}\`)\n${oR.reportPreview}\n`
        : '';

    const attemptsSummary = (label, stage) => {
        const list = (stage.attemptedModels || [])
            .map((a) => `\`${a.model}\`${a.withGoogleSearch !== undefined ? ` [search=${a.withGoogleSearch}]` : ''}: HTTP ${a.httpStatus}${a.error ? ` (${String(a.error).slice(0, 140)})` : ''}`)
            .join('; ');
        return `- **${label}** (\`${stage.status}\`): ${list || stage.errorMessage || 'OK'}`;
    };

    return `# Benchmark Comparativo Controlado: OpenAI (${summary.providers.openai.imageModel || 'N/D'}) vs. Google Gemini (${summary.providers.gemini.imageModel || 'N/D'})

**Fecha de ejecución:** ${summary.generatedAtIso}  
${statusBanner}  
**Caso de prueba idéntico:** \`${summary.caseId}\` (maniquí sintético \`SYNTH_COUTURE_HOURGLASS_01\`: \`168 cm / 96-68-102 cm / espalda 38 cm\`, Mikado \`280 gsm #124E3F\`, encaje Chantilly \`#C5A880\`).  
**Condiciones de salida:** OpenAI \`${summary.parityConditions.imageSize}\` (\`quality=${summary.parityConditions.quality}\`), Gemini \`aspectRatio=${summary.parityConditions.geminiAspectRatio}\` · \`imageSize=${summary.parityConditions.geminiImageSize}\`, fondo \`#FAF7F2\`.

---

## 1. Investigación Técnica Documentada (Separada de Generación Visual)

| Métrica de Investigación | OpenAI | Google Gemini |
|---|---|---|
| **Estado real** | ${fmtResearchCell(oR)} | ${fmtResearchCell(gR)} |
| **Modelo y endpoint** | \`${oR.model || 'N/D'}\` (\`${oR.endpoint || 'N/D'}\`) | \`${gR.model || 'N/D'}\` (\`${gR.endpoint || 'N/D'}\`) |
| **Tiempo de respuesta** | ${oR.elapsedMs} ms | ${gR.elapsedMs} ms |
| **Fuentes web verificadas** | ${oR.citations.length} citas | ${gR.citations.length} citas |
| **Consumo bruto (in / out / total tokens)** | ${oR.usage.inputTokens} / ${oR.usage.outputTokens} / ${oR.usage.totalTokens} | ${gR.usage.inputTokens} / ${gR.usage.outputTokens} / ${gR.usage.totalTokens} |
| **Costo registrado** | ${fmtCost(oR.costUsd)} | ${fmtCost(gR.costUsd)} |

- Informe OpenAI: [results/openai_research.md](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-ai-haute-couture-comparison/results/openai_research.md)
- Informe Gemini: [results/gemini_research.md](file:///d:/Datos/Datos/DATOS%20JVINAS/Antigravity/2.ByKatherineCarroll/AtelierDigitalApp/poc-ai-haute-couture-comparison/results/gemini_research.md)
${openaiExcerpt}${geminiExcerpt}
---

## 2. Generación Visual Inicial (\`v1\`) y Modificación Conversacional (\`v2\`)

| Etapa / Métrica | OpenAI (\`${summary.providers.openai.imageModel || 'N/D'}\`) | Google Gemini (\`${summary.providers.gemini.imageModel || 'N/D'}\`) |
|---|---|---|
| **\`v1\` Estado / Archivo** | ${fmtImageLinkOrError('openai', 'openai_v1_initial', oV1)} | ${fmtImageLinkOrError('gemini', 'gemini_v1_initial', gV1)} |
| **\`v1\` Tiempo respuesta** | ${oV1.elapsedMs} ms | ${gV1.elapsedMs} ms |
| **\`v1\` Auditoría geométrica 96-68-102** | ${fmtAudit(oV1.geometricAudit)} | ${fmtAudit(gV1.geometricAudit)} |
| **\`v1\` Consumo / Costo** | ${oV1.usage.totalTokens} tokens · ${fmtCost(oV1.costUsd)} | ${gV1.usage.totalTokens} tokens · ${fmtCost(gV1.costUsd)} |
| **\`v2\` Estado / Archivo** | ${fmtImageLinkOrError('openai', 'openai_v2_edited', oV2)} | ${fmtImageLinkOrError('gemini', 'gemini_v2_edited', gV2)} |
| **\`v2\` Tiempo respuesta** | ${oV2.elapsedMs} ms | ${gV2.elapsedMs} ms |
| **\`v2\` Auditoría geométrica 96-68-102** | ${fmtAudit(oV2.geometricAudit)} | ${fmtAudit(gV2.geometricAudit)} |
| **\`v2\` Consumo / Costo** | ${oV2.usage.totalTokens} tokens · ${fmtCost(oV2.costUsd)} | ${gV2.usage.totalTokens} tokens · ${fmtCost(gV2.costUsd)} |

---

## 3. Matriz Evaluativa de los 6 Criterios + Revisión Visual Obligatoria

| Criterio | OpenAI | Gemini | Cómo verificar |
|---|---|---|---|
| **1. Fidelidad corporal** | ${oV1.status === 'OK' ? `Automático: \`${fmtAudit(oV1.geometricAudit)}\` / \`${fmtAudit(oV2.geometricAudit)}\`` : `No evaluable (bloqueado HTTP ${oV1.httpStatus ?? 'N/A'})`} | ${gV1.status === 'OK' ? `Automático: \`${fmtAudit(gV1.geometricAudit)}\` / \`${fmtAudit(gV2.geometricAudit)}\`` : `No evaluable (bloqueado HTTP ${gV1.httpStatus ?? 'N/A'})`} | Activar overlay Jaula SVG 1:1 en \`viewer/comparison_viewer.html\` |
| **2. Fidelidad del diseño** | ${oV1.status === 'OK' ? 'Inspección visual de corte princesa, escote corazón (`v1`) y barco asimétrico + mangas 3/4 (`v2`)' : `Sin imagen (${oV1.status})`} | ${gV1.status === 'OK' ? 'Inspección visual homóloga' : `Sin imagen (${gV1.status})`} | Comparar \`v1\` y \`v2\` lado a lado |
| **3. Representación textil** | ${oV1.status === 'OK' ? 'Sarga estructurada Mikado 280 gsm `#124E3F` -> `#1B3B4B` + encaje Lunéville `#C5A880`' : `Sin imagen (${oV1.status})`} | ${gV1.status === 'OK' ? 'Inspección visual homóloga' : `Sin imagen (${gV1.status})`} | Revisar pliegues y contraste tul ilusión |
| **4. Realismo fotográfico** | ${oV1.status === 'OK' ? 'Inspección de iluminación de taller sin artefactos' : `Sin imagen (${oV1.status})`} | ${gV1.status === 'OK' ? 'Inspección homóloga' : `Sin imagen (${gV1.status})`} | Zoom sobre costuras y caída inferior |
| **5. Capacidad de edición (\`v1->v2\`)** | ${oV2.status === 'OK' ? 'Preservación del cuerpo/encuadre al cambiar color, escote y añadir mangas' : `No ejecutado (${oV2.status})`} | ${gV2.status === 'OK' ? 'Preservación homóloga' : `No ejecutado (${gV2.status})`} | Comparar silueta \`v1\` vs \`v2\` |
| **6. Tiempo y costo real** | Total registrado: ${oR.elapsedMs + oV1.elapsedMs + oV2.elapsedMs} ms · ${fmtCost(summary.providers.openai.totalCostUsd)} | Total registrado: ${gR.elapsedMs + gV1.elapsedMs + gV2.elapsedMs} ms · ${fmtCost(summary.providers.gemini.totalCostUsd)} | Datos exactos en \`results/comparison_summary.json\` |

---

## 4. Trazabilidad de Disponibilidad y Cuotas Registradas

${attemptsSummary('OpenAI Fase 1 (Investigación)', oR)}
${attemptsSummary('OpenAI Fase 2 (Imagen v1)', oV1)}
${attemptsSummary('OpenAI Fase 3 (Edición v2)', oV2)}
${attemptsSummary('Gemini Fase 1 (Investigación)', gR)}
${attemptsSummary('Gemini Fase 2 (Imagen v1)', gV1)}
${attemptsSummary('Gemini Fase 3 (Edición v2)', gV2)}
`;
}

async function main() {
    fs.mkdirSync(RESULTS_DIR, { recursive: true });
    const preflightOnly = process.argv.includes('--preflight-only');

    // 1. Regenerar y validar insumos de referencia sintéticos
    const refInfo = generateAllReferenceInputs();
    const testCase = JSON.parse(fs.readFileSync(refInfo.testCasePath, 'utf8'));

    // 2. Cargar configuración sin imprimir jamás secretos
    const { cfg, envSources } = loadIsolatedConfig();
    const openAiKey = (cfg.OPENAI_API_KEY || '').trim();
    const geminiKey = (cfg.GEMINI_API_KEY || cfg.GOOGLE_API_KEY || '').trim();
    const timeoutMs = Number(cfg.REQUEST_TIMEOUT_MS || 180000);

    const imageSize = cfg.IMAGE_SIZE || testCase.parityConditions.imageSize || '1024x1536';
    const imageQuality = cfg.IMAGE_QUALITY || testCase.parityConditions.quality || 'high';
    const geminiAspect = cfg.GEMINI_ASPECT_RATIO || testCase.parityConditions.aspectRatio || '2:3';
    const geminiImageSize = (cfg.GEMINI_IMAGE_SIZE || '1K').trim();
    const parityConditions = {
        imageSize,
        quality: imageQuality,
        geminiAspectRatio: geminiAspect,
        geminiImageSize,
    };

    const configuredOpenAiImageModel = (cfg.OPENAI_IMAGE_MODEL || OPENAI_LOCKED_IMAGE_MODEL).trim();
    const configuredGeminiImageModel = (cfg.GEMINI_IMAGE_MODEL || GEMINI_LOCKED_IMAGE_MODEL).trim();
    if (
        configuredOpenAiImageModel !== OPENAI_LOCKED_IMAGE_MODEL ||
        configuredGeminiImageModel !== GEMINI_LOCKED_IMAGE_MODEL
    ) {
        console.error(
            `[PoC-AI-Compare] Configuración inválida: los modelos de imagen están bloqueados estrictamente a '${OPENAI_LOCKED_IMAGE_MODEL}' y '${GEMINI_LOCKED_IMAGE_MODEL}'.`
        );
        process.exit(1);
    }

    const openAiResearchCandidates = parseModelCandidates(
        cfg.OPENAI_RESEARCH_MODEL || 'gpt-4.1',
        cfg.OPENAI_RESEARCH_FALLBACK_MODELS || 'gpt-4o,gpt-4.1-mini'
    );
    const openAiImageCandidates = [OPENAI_LOCKED_IMAGE_MODEL];
    const geminiResearchCandidates = parseModelCandidates(
        cfg.GEMINI_RESEARCH_MODEL || 'gemini-3.5-flash',
        cfg.GEMINI_RESEARCH_FALLBACK_MODELS || 'gemini-3.1-flash-lite,gemini-3.8-flash,gemini-2.5-pro,gemini-2.5-flash'
    );
    const geminiImageCandidates = [GEMINI_LOCKED_IMAGE_MODEL];

    const missingKeys = [];
    if (!openAiKey) missingKeys.push('OPENAI_API_KEY');
    if (!geminiKey) missingKeys.push('GEMINI_API_KEY');

    // Detener limpiamente sin simular resultados si falta alguna clave
    if (missingKeys.length > 0) {
        const preflight = {
            status: 'WAITING_FOR_API_KEYS',
            checkedAtIso: new Date().toISOString(),
            preflightOnly,
            missingKeys,
            envSources,
            configuredCredentialsPresence: {
                OPENAI_API_KEY_PRESENT: Boolean(openAiKey),
                GEMINI_API_KEY_PRESENT: Boolean(geminiKey),
            },
            parityConditions,
            requestedModels: {
                openai: { researchCandidates: openAiResearchCandidates, imageCandidates: openAiImageCandidates },
                gemini: { researchCandidates: geminiResearchCandidates, imageCandidates: geminiImageCandidates },
            },
            syntheticReferenceValidation: {
                mannequinPath: 'inputs/reference_mannequin_1024x1536.png',
                swatchPath: 'inputs/reference_fabric_swatch_512x512.png',
                cageOverlayPath: 'inputs/reference_body_cage_overlay.svg',
                mannequinSelfAudit: refInfo.mannequinSelfAudit,
            },
            instructions: [
                'Copia poc-ai-haute-couture-comparison/.env.example a poc-ai-haute-couture-comparison/.env',
                'Completa OPENAI_API_KEY y GEMINI_API_KEY en poc-ai-haute-couture-comparison/.env (excluido de Git)',
                'Vuelve a ejecutar: node poc-ai-haute-couture-comparison/run_comparison.cjs',
            ],
        };
        fs.writeFileSync(path.join(RESULTS_DIR, 'preflight_status.json'), JSON.stringify(preflight, null, 2), 'utf8');
        console.log('[PoC-AI-Compare] Entorno e insumos sintéticos listos en poc-ai-haute-couture-comparison/.');
        console.log(`[PoC-AI-Compare] DETENIDO SIN SIMULAR RESULTADOS · Faltan credenciales: ${missingKeys.join(', ')}`);
        console.log('[PoC-AI-Compare] Configura poc-ai-haute-couture-comparison/.env (ignorado por Git) y re-ejecuta este script.');
        process.exit(0);
    }

    // 3. Verificar disponibilidad real de los modelos en ambos endpoints antes de generar
    console.log('[PoC-AI-Compare] Verificando disponibilidad real de modelos en OpenAI y Google Gemini...');
    const [oaiCheck, gemCheck] = await Promise.all([
        checkOpenAiModels(openAiKey, openAiResearchCandidates, openAiImageCandidates, timeoutMs),
        checkGeminiModels(geminiKey, geminiResearchCandidates, geminiImageCandidates, timeoutMs),
    ]);

    const preflightReport = {
        status: oaiCheck.ok && gemCheck.ok ? 'MODELS_CHECKED' : 'PROVIDER_CHECK_FAILED',
        checkedAtIso: new Date().toISOString(),
        preflightOnly,
        envSources,
        parityConditions,
        syntheticReferenceValidation: {
            mannequinPath: 'inputs/reference_mannequin_1024x1536.png',
            swatchPath: 'inputs/reference_fabric_swatch_512x512.png',
            cageOverlayPath: 'inputs/reference_body_cage_overlay.svg',
            mannequinSelfAudit: refInfo.mannequinSelfAudit,
        },
        openai: oaiCheck,
        gemini: gemCheck,
    };
    fs.writeFileSync(path.join(RESULTS_DIR, 'preflight_status.json'), JSON.stringify(preflightReport, null, 2), 'utf8');

    if (!oaiCheck.ok || !gemCheck.ok) {
        console.error('[PoC-AI-Compare] Falló la verificación de conectividad/modelos. Revisar results/preflight_status.json.');
        process.exit(1);
    }

    const oaiResearchList = oaiCheck.researchResolution.availableCandidates || [];
    const gemResearchList = gemCheck.researchResolution.availableCandidates || [];
    const oaiImageModel = oaiCheck.imageResolution.selectedModel;
    const gemImageModel = gemCheck.imageResolution.selectedModel;

    if (
        !oaiResearchList.length ||
        !gemResearchList.length ||
        oaiImageModel !== OPENAI_LOCKED_IMAGE_MODEL ||
        gemImageModel !== GEMINI_LOCKED_IMAGE_MODEL
    ) {
        console.error('[PoC-AI-Compare] Uno o más modelos requeridos no están disponibles exactamente:', JSON.stringify(preflightReport));
        process.exit(1);
    }

    console.log(
        `[PoC-AI-Compare] Modelos verificados -> OpenAI (Research: ${oaiResearchList[0]}, Image: ${oaiImageModel}) | ` +
        `Gemini (Research: ${gemResearchList[0]}, Image: ${gemImageModel}, imageSize=${geminiImageSize})`
    );

    if (preflightOnly) {
        console.log('[PoC-AI-Compare] Preflight-only completado sin consumir investigación ni generaciones de imágenes. Ver results/preflight_status.json.');
        process.exit(0);
    }

    const openAiRates = {
        inRate: parseOptionalNumber(cfg.OPENAI_RESEARCH_INPUT_USD_PER_1M),
        outRate: parseOptionalNumber(cfg.OPENAI_RESEARCH_OUTPUT_USD_PER_1M),
        unitUsd: parseOptionalNumber(cfg.OPENAI_IMAGE_UNIT_USD),
        imgInRate: parseOptionalNumber(cfg.OPENAI_IMAGE_INPUT_USD_PER_1M),
        imgOutRate: parseOptionalNumber(cfg.OPENAI_IMAGE_OUTPUT_USD_PER_1M),
    };
    const geminiRates = {
        inRate: parseOptionalNumber(cfg.GEMINI_RESEARCH_INPUT_USD_PER_1M),
        outRate: parseOptionalNumber(cfg.GEMINI_RESEARCH_OUTPUT_USD_PER_1M),
        unitUsd: parseOptionalNumber(cfg.GEMINI_IMAGE_UNIT_USD),
        imgInRate: parseOptionalNumber(cfg.GEMINI_IMAGE_INPUT_USD_PER_1M),
        imgOutRate: parseOptionalNumber(cfg.GEMINI_IMAGE_OUTPUT_USD_PER_1M),
    };

    const mannequinBuffer = fs.readFileSync(refInfo.mannequinPath);
    const swatchBuffer = fs.readFileSync(refInfo.swatchPath);

    // 4. FASE 1 — INVESTIGACIÓN TÉCNICA DOCUMENTADA (SEPARADA DE IMAGEN)
    console.log('[PoC-AI-Compare] Fase 1/3: Ejecutando investigación técnica en OpenAI y Gemini...');
    const [oaiResearch, gemResearch] = await Promise.all([
        executePhaseSafely(
            () => runOpenAiResearch(openAiKey, oaiResearchList, testCase.prompts.researchPrompt, openAiRates, timeoutMs),
            { provider: 'openai', model: oaiResearchList[0], endpoint: 'POST /v1/responses (web_search)' }
        ),
        executePhaseSafely(
            () => runGeminiResearch(geminiKey, gemResearchList, testCase.prompts.researchPrompt, geminiRates, timeoutMs),
            { provider: 'gemini', model: gemResearchList[0], endpoint: `POST /v1beta/models/${gemResearchList[0]}:generateContent (googleSearch)` }
        ),
    ]);

    fs.writeFileSync(path.join(RESULTS_DIR, 'openai_research.json'), JSON.stringify(oaiResearch, null, 2), 'utf8');
    fs.writeFileSync(path.join(RESULTS_DIR, 'openai_research.md'), buildResearchMarkdownDoc('OpenAI', oaiResearch), 'utf8');
    fs.writeFileSync(path.join(RESULTS_DIR, 'gemini_research.json'), JSON.stringify(gemResearch, null, 2), 'utf8');
    fs.writeFileSync(path.join(RESULTS_DIR, 'gemini_research.md'), buildResearchMarkdownDoc('Google Gemini', gemResearch), 'utf8');

    // 5. FASE 2 — GENERACIÓN VISUAL INICIAL (v1)
    console.log('[PoC-AI-Compare] Fase 2/3: Generando imagen inicial v1 en OpenAI y Gemini...');
    const [oaiV1, gemV1] = await Promise.all([
        executePhaseSafely(
            () => runOpenAiImageEdit({
                apiKey: openAiKey,
                model: oaiImageModel,
                imageBuffersWithNames: [
                    { filename: 'reference_mannequin_1024x1536.png', buffer: mannequinBuffer },
                    { filename: 'reference_fabric_swatch_512x512.png', buffer: swatchBuffer },
                ],
                prompt: testCase.prompts.initialGenerationPrompt,
                size: imageSize,
                quality: imageQuality,
                rates: openAiRates,
                timeoutMs,
            }),
            { provider: 'openai', model: oaiImageModel, endpoint: 'POST /v1/images/edits' }
        ),
        executePhaseSafely(
            () => runGeminiImageGenerate({
                apiKey: geminiKey,
                model: gemImageModel,
                imageBuffersWithLabels: [
                    { filename: 'reference_mannequin_1024x1536.png', buffer: mannequinBuffer },
                    { filename: 'reference_fabric_swatch_512x512.png', buffer: swatchBuffer },
                ],
                prompt: testCase.prompts.initialGenerationPrompt,
                aspectRatio: geminiAspect,
                geminiImageSize,
                rates: geminiRates,
                timeoutMs,
            }),
            { provider: 'gemini', model: gemImageModel, endpoint: `POST /v1beta/models/${gemImageModel}:generateContent (aspectRatio=${geminiAspect}, imageSize=${geminiImageSize})` }
        ),
    ]);

    let oaiV1Ext = null;
    let oaiV1Audit = { audited: false, reason: oaiV1.errorMessage || 'Sin imagen v1 generada.' };
    if (oaiV1.status === 'OK') {
        oaiV1Ext = 'png';
        fs.writeFileSync(path.join(RESULTS_DIR, `openai_v1_initial.${oaiV1Ext}`), oaiV1.pngBuffer);
        oaiV1Audit = tryAuditImageBuffer(oaiV1.pngBuffer, 'image/png');
    }

    let gemV1Ext = null;
    let gemV1Audit = { audited: false, reason: gemV1.errorMessage || 'Sin imagen v1 generada.' };
    if (gemV1.status === 'OK') {
        gemV1Ext = gemV1.mimeType.includes('jpeg') ? 'jpg' : 'png';
        fs.writeFileSync(path.join(RESULTS_DIR, `gemini_v1_initial.${gemV1Ext}`), gemV1.imageBuffer);
        gemV1Audit = tryAuditImageBuffer(gemV1.imageBuffer, gemV1.mimeType);
    }

    // 6. FASE 3 — MODIFICACIÓN CONVERSACIONAL (v2) SOLO SI v1 TUVO ÉXITO
    console.log('[PoC-AI-Compare] Fase 3/3: Evaluando modificación conversacional v2...');
    const skippedV2 = (provider, model, reason) => ({
        status: 'SKIPPED',
        httpStatus: null,
        errorMessage: reason,
        attemptedModels: [],
        provider,
        model,
        endpoint: null,
        elapsedMs: 0,
        usage: { inputTokens: 0, outputTokens: 0, totalTokens: 0 },
        costUsd: null,
        pricingSource: 'OMITIDO_POR_DEPENDENCIA_V1',
    });

    const [oaiV2, gemV2] = await Promise.all([
        oaiV1.status === 'OK'
            ? executePhaseSafely(
                () => runOpenAiImageEdit({
                    apiKey: openAiKey,
                    model: oaiImageModel,
                    imageBuffersWithNames: [
                        { filename: 'previous_gown_v1.png', buffer: oaiV1.pngBuffer },
                        { filename: 'reference_mannequin_1024x1536.png', buffer: mannequinBuffer },
                    ],
                    prompt: testCase.prompts.conversationalEditPrompt,
                    size: imageSize,
                    quality: imageQuality,
                    rates: openAiRates,
                    timeoutMs,
                }),
                { provider: 'openai', model: oaiImageModel, endpoint: 'POST /v1/images/edits' }
            )
            : Promise.resolve(skippedV2('openai', oaiImageModel, `Omitido porque v1 falló (HTTP ${oaiV1.httpStatus ?? 'N/A'})`)),
        gemV1.status === 'OK'
            ? executePhaseSafely(
                () => runGeminiImageGenerate({
                    apiKey: geminiKey,
                    model: gemImageModel,
                    imageBuffersWithLabels: [
                        { filename: `previous_gown_v1.${gemV1Ext}`, buffer: gemV1.imageBuffer },
                        { filename: 'reference_mannequin_1024x1536.png', buffer: mannequinBuffer },
                    ],
                    prompt: testCase.prompts.conversationalEditPrompt,
                    aspectRatio: geminiAspect,
                    geminiImageSize,
                    rates: geminiRates,
                    timeoutMs,
                }),
                { provider: 'gemini', model: gemImageModel, endpoint: `POST /v1beta/models/${gemImageModel}:generateContent (aspectRatio=${geminiAspect}, imageSize=${geminiImageSize})` }
            )
            : Promise.resolve(skippedV2('gemini', gemImageModel, `Omitido porque v1 falló (HTTP ${gemV1.httpStatus ?? 'N/A'})`)),
    ]);

    let oaiV2Ext = null;
    let oaiV2Audit = { audited: false, reason: oaiV2.errorMessage || 'Sin imagen v2 generada.' };
    if (oaiV2.status === 'OK') {
        oaiV2Ext = 'png';
        fs.writeFileSync(path.join(RESULTS_DIR, `openai_v2_edited.${oaiV2Ext}`), oaiV2.pngBuffer);
        oaiV2Audit = tryAuditImageBuffer(oaiV2.pngBuffer, 'image/png');
    }

    let gemV2Ext = null;
    let gemV2Audit = { audited: false, reason: gemV2.errorMessage || 'Sin imagen v2 generada.' };
    if (gemV2.status === 'OK') {
        gemV2Ext = gemV2.mimeType.includes('jpeg') ? 'jpg' : 'png';
        fs.writeFileSync(path.join(RESULTS_DIR, `gemini_v2_edited.${gemV2Ext}`), gemV2.imageBuffer);
        gemV2Audit = tryAuditImageBuffer(gemV2.imageBuffer, gemV2.mimeType);
    }

    const sumCost = (...vals) => (vals.every((v) => typeof v === 'number') ? vals.reduce((a, b) => a + b, 0) : null);
    const allPhases = [oaiResearch, oaiV1, oaiV2, gemResearch, gemV1, gemV2];
    const allOk = allPhases.every((p) => p.status === 'OK');
    const anyQuotaBlocked = allPhases.some(
        (p) => p.status === 'ERROR' && (p.httpStatus === 429 || /quota|resource_exhausted/i.test(p.errorMessage || ''))
    );
    const globalStatus = allOk
        ? 'COMPLETED'
        : anyQuotaBlocked
            ? 'PARTIAL_BLOCKED_BY_PROVIDER_QUOTA'
            : 'PARTIAL_WITH_ERRORS';

    const buildExcerpt = (md) => {
        if (!md) return '';
        const clean = md.trim();
        return clean.length > 750 ? `${clean.slice(0, 750)}...` : clean;
    };

    const summary = {
        status: globalStatus,
        generatedAtIso: new Date().toISOString(),
        caseId: testCase.caseId,
        parityConditions,
        providers: {
            openai: {
                requestedImageModels: openAiImageCandidates,
                imageModel: oaiImageModel,
                research: {
                    status: oaiResearch.status,
                    httpStatus: oaiResearch.httpStatus,
                    errorMessage: oaiResearch.errorMessage || null,
                    attemptedModels: oaiResearch.attemptedModels || [],
                    model: oaiResearch.model,
                    endpoint: oaiResearch.endpoint,
                    elapsedMs: oaiResearch.elapsedMs,
                    groundingNote: oaiResearch.groundingNote || null,
                    citations: oaiResearch.citations,
                    reportPreview: buildExcerpt(oaiResearch.reportMarkdown),
                    usage: oaiResearch.usage,
                    costUsd: oaiResearch.costUsd,
                    pricingSource: oaiResearch.pricingSource,
                },
                v1: {
                    status: oaiV1.status,
                    httpStatus: oaiV1.httpStatus,
                    errorMessage: oaiV1.errorMessage || null,
                    attemptedModels: oaiV1.attemptedModels || [],
                    model: oaiV1.model,
                    ext: oaiV1Ext,
                    elapsedMs: oaiV1.elapsedMs,
                    usage: oaiV1.usage,
                    costUsd: oaiV1.costUsd,
                    pricingSource: oaiV1.pricingSource,
                    geometricAudit: oaiV1Audit,
                },
                v2: {
                    status: oaiV2.status,
                    httpStatus: oaiV2.httpStatus,
                    errorMessage: oaiV2.errorMessage || null,
                    attemptedModels: oaiV2.attemptedModels || [],
                    model: oaiV2.model,
                    ext: oaiV2Ext,
                    elapsedMs: oaiV2.elapsedMs,
                    usage: oaiV2.usage,
                    costUsd: oaiV2.costUsd,
                    pricingSource: oaiV2.pricingSource,
                    geometricAudit: oaiV2Audit,
                },
                totalCostUsd: sumCost(oaiResearch.costUsd, oaiV1.costUsd, oaiV2.costUsd),
            },
            gemini: {
                requestedImageModels: geminiImageCandidates,
                imageModel: gemImageModel,
                research: {
                    status: gemResearch.status,
                    httpStatus: gemResearch.httpStatus,
                    errorMessage: gemResearch.errorMessage || null,
                    attemptedModels: gemResearch.attemptedModels || [],
                    model: gemResearch.model,
                    endpoint: gemResearch.endpoint,
                    elapsedMs: gemResearch.elapsedMs,
                    groundingNote: gemResearch.groundingNote || null,
                    citations: gemResearch.citations,
                    reportPreview: buildExcerpt(gemResearch.reportMarkdown),
                    usage: gemResearch.usage,
                    costUsd: gemResearch.costUsd,
                    pricingSource: gemResearch.pricingSource,
                },
                v1: {
                    status: gemV1.status,
                    httpStatus: gemV1.httpStatus,
                    errorMessage: gemV1.errorMessage || null,
                    attemptedModels: gemV1.attemptedModels || [],
                    model: gemV1.model,
                    ext: gemV1Ext,
                    mimeType: gemV1.mimeType || null,
                    elapsedMs: gemV1.elapsedMs,
                    usage: gemV1.usage,
                    costUsd: gemV1.costUsd,
                    pricingSource: gemV1.pricingSource,
                    geometricAudit: gemV1Audit,
                },
                v2: {
                    status: gemV2.status,
                    httpStatus: gemV2.httpStatus,
                    errorMessage: gemV2.errorMessage || null,
                    attemptedModels: gemV2.attemptedModels || [],
                    model: gemV2.model,
                    ext: gemV2Ext,
                    mimeType: gemV2.mimeType || null,
                    elapsedMs: gemV2.elapsedMs,
                    usage: gemV2.usage,
                    costUsd: gemV2.costUsd,
                    pricingSource: gemV2.pricingSource,
                    geometricAudit: gemV2Audit,
                },
                totalCostUsd: sumCost(gemResearch.costUsd, gemV1.costUsd, gemV2.costUsd),
            },
        },
    };

    fs.writeFileSync(path.join(RESULTS_DIR, 'comparison_summary.json'), JSON.stringify(summary, null, 2), 'utf8');
    fs.writeFileSync(
        path.join(POC_ROOT, 'BENCHMARK_COMPARATIVO_OPENAI_VS_GEMINI.md'),
        formatComparisonMarkdown(summary),
        'utf8'
    );
    console.log(`[PoC-AI-Compare] Ejecución finalizada (${summary.status}). Ver BENCHMARK_COMPARATIVO_OPENAI_VS_GEMINI.md y results/comparison_summary.json.`);
    process.exit(0);
}

main().catch((err) => {
    console.error('[PoC-AI-Compare] Error inesperado en ejecución:', err.message);
    process.exit(1);
});
