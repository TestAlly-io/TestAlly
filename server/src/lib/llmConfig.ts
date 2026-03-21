/**
 * LLM endpoint from the environment (OpenAI-compatible base URL).
 * LLM_API_URL may be `host:port` or a full URL; a scheme is added if missing.
 */
export function parseLlmApiUrl(raw: string | undefined): URL | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  try {
    return new URL(t.includes('://') ? t : `http://${t}`);
  } catch {
    return null;
  }
}

export function getLlmApiBaseUrl(): URL | null {
  return parseLlmApiUrl(process.env.LLM_API_URL);
}

export function isLlmConfigured(): boolean {
  return getLlmApiBaseUrl() !== null;
}

/** Optional bearer token for gateways that expect Authorization (e.g. LLM_TOKEN in Docker). */
export function getLlmAuthHeaders(): Record<string, string> {
  const token = process.env.LLM_TOKEN?.trim();
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}

/** Resolve a path against LLM_API_URL for fetch() (e.g. `v1/chat/completions`). */
export function resolveLlmUrl(path: string): URL | null {
  const base = getLlmApiBaseUrl();
  if (!base) return null;
  const normalized = path.startsWith('/') ? path.slice(1) : path;
  return new URL(normalized, base.href.endsWith('/') ? base.href : `${base.href}/`);
}
