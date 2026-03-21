import { getLlmApiBaseUrl, getLlmAuthHeaders, resolveLlmUrl } from './llmConfig.js';

const PROBE_MS = Math.min(
  Math.max(Number(process.env.LLM_PROBE_TIMEOUT_MS) || 8_000, 2_000),
  60_000,
);

export interface LlmProbeResult {
  ok: boolean;
  /** How we verified reachability */
  via: 'ollama-tags' | 'openai-models' | 'none';
  latencyMs: number;
  /** Model ids reported by the server (subset) */
  models?: string[];
  message?: string;
}

/**
 * Checks TCP/HTTP reachability and basic API shape — does not run a full chat completion.
 */
export async function probeLlmConnection(): Promise<LlmProbeResult> {
  const base = getLlmApiBaseUrl();
  if (!base) {
    return {
      ok: false,
      via: 'none',
      latencyMs: 0,
      message: 'LLM_API_URL is not set',
    };
  }

  const started = Date.now();

  const ollama = await tryOllamaTags(base);
  if (ollama) {
    return {
      ok: true,
      via: 'ollama-tags',
      latencyMs: Date.now() - started,
      models: ollama.names.slice(0, 50),
      message: `Ollama reachable (${ollama.names.length} model(s))`,
    };
  }

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

  return {
    ok: false,
    via: 'none',
    latencyMs: Date.now() - started,
    message:
      'Could not reach Ollama (/api/tags) or OpenAI-compatible (/v1/models). Check LLM_API_URL, network (e.g. host.docker.internal), and that the server is running.',
  };
}

async function tryOllamaTags(base: URL): Promise<{ names: string[] } | null> {
  try {
    const tagsUrl = new URL('/api/tags', `${base.origin}/`);
    const res = await fetch(tagsUrl, {
      method: 'GET',
      headers: { ...getLlmAuthHeaders() },
      signal: AbortSignal.timeout(PROBE_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { models?: Array<{ name?: string }> };
    if (!Array.isArray(data.models)) return null;
    const names = data.models.map((m) => m.name).filter((n): n is string => typeof n === 'string');
    return { names };
  } catch {
    return null;
  }
}

async function tryOpenAiModels(): Promise<{ ids: string[] } | null> {
  try {
    const url = resolveLlmUrl('v1/models');
    if (!url) return null;
    const res = await fetch(url, {
      method: 'GET',
      headers: { ...getLlmAuthHeaders() },
      signal: AbortSignal.timeout(PROBE_MS),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ id?: string }> };
    if (!Array.isArray(data.data)) return null;
    const ids = data.data.map((m) => m.id).filter((id): id is string => typeof id === 'string');
    return { ids };
  } catch {
    return null;
  }
}
