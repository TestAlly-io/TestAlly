import { getLlmApiBaseUrl, getLlmAuthHeaders } from './llmConfig.js';

const PROBE_MS = Math.min(
  Math.max(Number(process.env.LLM_PROBE_TIMEOUT_MS) || 8_000, 2_000),
  60_000,
);

/** Max time for one HTTP attempt (connect + headers + body). */
const ATTEMPT_MS = PROBE_MS;

/** Never hang on `res.json()` if headers arrived but body stalls. */
const BODY_READ_MS = Math.min(Math.max(PROBE_MS, 3_000), 15_000);

/**
 * Hard ceiling for the whole probe (Ollama try + OpenAI try + body reads).
 * Ensures GET /api/health/llm always completes (no infinite browser spin).
 */
const OUTER_PROBE_MS = Math.min(PROBE_MS * 2 + 12_000, 90_000);

export interface LlmProbeResult {
  ok: boolean;
  /** How we verified reachability */
  via: 'ollama-tags' | 'openai-models' | 'none';
  latencyMs: number;
  /** Model ids reported by the server (subset) */
  models?: string[];
  message?: string;
}

function readJsonWithTimeout(res: Response, ms: number): Promise<unknown> {
  return Promise.race([
    res.json() as Promise<unknown>,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('response body read timed out')), ms),
    ),
  ]);
}

/**
 * Checks TCP/HTTP reachability and basic API shape — does not run a full chat completion.
 */
export async function probeLlmConnection(): Promise<LlmProbeResult> {
  return Promise.race([runProbe(), outerTimeoutResult()]);
}

function outerTimeoutResult(): Promise<LlmProbeResult> {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          ok: false,
          via: 'none',
          latencyMs: OUTER_PROBE_MS,
          message: `LLM probe exceeded ${OUTER_PROBE_MS}ms (outer cap). Check LLM_API_URL or INFERENCE_LLM_PROVIDER_HOST, firewalls, and that the gateway is running.`,
        }),
      OUTER_PROBE_MS,
    ),
  );
}

async function runProbe(): Promise<LlmProbeResult> {
  const base = getLlmApiBaseUrl();
  if (!base) {
    return {
      ok: false,
      via: 'none',
      latencyMs: 0,
      message: 'LLM not configured — set LLM_API_URL or INFERENCE_LLM_PROVIDER_* / CLOUDFEST_HOST',
    };
  }

  const started = Date.now();

  try {
    const openai = await tryOpenAiModels();
    if (openai) {
      return {
        ok: true,
        via: 'openai-models',
        latencyMs: Date.now() - started,
        models: openai.ids.slice(0, 50),
        message: `OpenAI-compatible /v1/models reachable (${openai.ids.length} id(s))`,
      };
    }

    const ollama = await tryOllamaTags(base);
    if (ollama) {
      return {
        ok: true,
        via: 'ollama-tags',
        latencyMs: Date.now() - started,
        models: ollama.names.slice(0, 50),
        message: `Ollama native /api/tags reachable (${ollama.names.length} model(s))`,
      };
    }

    return {
      ok: false,
      via: 'none',
      latencyMs: Date.now() - started,
      message:
        'Could not reach /v1/models or Ollama /api/tags. Check LLM_API_URL (e.g. http://host:11434 or …/v1), INFERENCE_LLM_PROVIDER_HOST, Docker networking, and that the server is running.',
    };
  } catch (e) {
    return {
      ok: false,
      via: 'none',
      latencyMs: Date.now() - started,
      message: e instanceof Error ? e.message : 'LLM probe failed',
    };
  }
}

/**
 * Ollama lists models at /api/tags on the server root, not under .../v1/.
 * If the base URL is a subpath proxy (e.g. /llama), tags live under that path.
 */
function ollamaTagsProbeUrl(base: URL): URL {
  const rawPath = base.pathname.replace(/\/$/, '');
  if (!rawPath || rawPath === '/' || rawPath.endsWith('/v1')) {
    return new URL('/api/tags', `${base.origin}/`);
  }
  return new URL('api/tags', `${base.origin}${rawPath}/`);
}

async function tryOllamaTags(base: URL): Promise<{ names: string[] } | null> {
  try {
    const tagsUrl = ollamaTagsProbeUrl(base);
    const res = await fetch(tagsUrl, {
      method: 'GET',
      headers: { ...getLlmAuthHeaders() },
      signal: AbortSignal.timeout(ATTEMPT_MS),
    });
    if (!res.ok) return null;
    const data = (await readJsonWithTimeout(res, BODY_READ_MS)) as {
      models?: Array<{ name?: string }>;
    };
    if (!Array.isArray(data.models)) return null;
    const names = data.models.map((m) => m.name).filter((n): n is string => typeof n === 'string');
    return { names };
  } catch {
    return null;
  }
}

async function tryOpenAiModels(): Promise<{ ids: string[] } | null> {
  try {
    const base = getLlmApiBaseUrl();
    if (!base) return null;
    const url = new URL('v1/models', base.href.endsWith('/') ? base.href : `${base.href}/`);
    const res = await fetch(url, {
      method: 'GET',
      headers: { ...getLlmAuthHeaders() },
      signal: AbortSignal.timeout(ATTEMPT_MS),
    });
    if (!res.ok) return null;
    const data = (await readJsonWithTimeout(res, BODY_READ_MS)) as {
      data?: Array<{ id?: string }>;
    };
    if (!Array.isArray(data.data)) return null;
    const ids = data.data.map((m) => m.id).filter((id): id is string => typeof id === 'string');
    return { ids };
  } catch {
    return null;
  }
}
