import { getRoleBaseUrl, getRoleAuthHeaders } from './llm/config.js';

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
  const baseUrl = getRoleBaseUrl('inference');
  if (!baseUrl) {
    return {
      ok: false,
      via: 'none',
      latencyMs: 0,
      message: 'Inference LLM is not configured',
    };
  }

  let base: URL;
  try {
    base = new URL(baseUrl);
  } catch {
    return {
      ok: false,
      via: 'none',
      latencyMs: 0,
      message: `Invalid inference LLM base URL: ${baseUrl}`,
    };
  }

  const started = Date.now();
  const authHeaders = getRoleAuthHeaders('inference');

  const ollama = await tryOllamaTags(base, authHeaders);
  if (ollama) {
    return {
      ok: true,
      via: 'ollama-tags',
      latencyMs: Date.now() - started,
      models: ollama.names.slice(0, 50),
      message: `Ollama reachable (${ollama.names.length} model(s))`,
    };
  }

  const openai = await tryOpenAiModels(base, authHeaders);
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
      'Could not reach Ollama (/api/tags) or OpenAI-compatible (/v1/models). Check INFERENCE_LLM_PROVIDER_HOST / CLOUDFEST_HOST, network, and that the server is running.',
  };
}

async function tryOllamaTags(base: URL, authHeaders: Record<string, string>): Promise<{ names: string[] } | null> {
  try {
    const tagsUrl = new URL('/api/tags', `${base.origin}/`);
    const res = await fetch(tagsUrl, {
      method: 'GET',
      headers: { ...authHeaders },
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

async function tryOpenAiModels(base: URL, authHeaders: Record<string, string>): Promise<{ ids: string[] } | null> {
  try {
    const url = new URL('v1/models', base.href.endsWith('/') ? base.href : `${base.href}/`);
    const res = await fetch(url, {
      method: 'GET',
      headers: { ...authHeaders },
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
