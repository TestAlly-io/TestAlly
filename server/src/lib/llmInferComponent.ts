import { getLlmAuthHeaders, getLlmApiBaseUrl, resolveLlmUrl } from './llmConfig.js';

const DEFAULT_MODEL = 'llama3.2';
const CHAT_PATH = process.env.LLM_CHAT_PATH?.trim() || 'v1/chat/completions';
const INFER_TIMEOUT_MS = Math.min(
  Math.max(Number(process.env.LLM_INFER_TIMEOUT_MS) || 120_000, 5_000),
  300_000,
);

const LANGUAGES = ['html', 'jsx', 'tsx', 'vue', 'svelte'] as const;
export type InferredLanguage = (typeof LANGUAGES)[number];

export interface InferComponentResult {
  language: InferredLanguage;
  /** Short UI pattern label, e.g. accordion, dialog, data table */
  componentKind: string;
  /** Inferred testing context from the source (not user-supplied prose) */
  description: string;
  /** Unused when input is source-only; client keeps original paste. Often "". */
  code: string;
  /** Extracted from <style> or top-level CSS in the same paste */
  css?: string;
  /** Extracted from <script> or top-level JS in the same paste */
  js?: string;
}

const SYSTEM_PROMPT = `You analyze UI COMPONENT SOURCE ONLY for an accessibility testing tool.

The user message is a single blob of source code (HTML, JSX, TSX, Vue, Svelte, or a mix). There are NO separate user instructions or notes—only implementation source.

Respond with ONLY valid JSON (no markdown fences):
{"language":"html|jsx|tsx|vue|svelte","componentKind":"short-label","description":"...","code":"","css":"","js":""}

Rules:
- language: primary language of the component markup/logic (not CSS-in-isolation unless the paste is CSS-only widget).
- componentKind: best UI pattern (e.g. accordion, dialog, combobox). If unclear, "unknown".
- description: 1–3 short sentences INFERRED from the code only—what this UI is, key interactions, and what an accessibility tester should focus on. No code snippets. No invented product story not implied by the source.
- code: always use exactly "" (empty string). The client keeps the original source; do not echo or rewrite it.
- css: if the paste includes a <style> block or a clear standalone CSS section, put that CSS here; else "".
- js: if the paste includes a <script> block or clear standalone script, put that here; else "".
Escape quotes properly in JSON strings.`;

function isInferredLanguage(x: string): x is InferredLanguage {
  return (LANGUAGES as readonly string[]).includes(x);
}

/** Qwen / DeepSeek-style reasoning blocks break JSON.parse if left in the assistant string. */
export function stripReasoningTags(text: string): string {
  return text
    .replace(/<think\b[^>]*>[\s\S]*?<\/think>/gi, '')
    .trim();
}

function extractJsonObject(text: string): Record<string, unknown> {
  const t = stripReasoningTags(text);
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/);
  const inner = fence ? fence[1].trim() : t;
  const start = inner.indexOf('{');
  const end = inner.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object in LLM response');
  }
  const jsonStr = inner.slice(start, end + 1);
  const parsed: unknown = JSON.parse(jsonStr);
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }
  throw new Error('LLM returned non-object JSON');
}

function strField(raw: Record<string, unknown>, key: string): string | undefined {
  const v = raw[key];
  return typeof v === 'string' && v.trim() ? v : undefined;
}

function normalizeResult(raw: Record<string, unknown>): InferComponentResult {
  const langRaw = typeof raw.language === 'string' ? raw.language.toLowerCase() : 'html';
  const language = isInferredLanguage(langRaw) ? langRaw : 'html';
  const css = strField(raw, 'css');
  const js = strField(raw, 'js');
  return {
    language,
    componentKind:
      typeof raw.componentKind === 'string' && raw.componentKind.trim()
        ? raw.componentKind.trim().slice(0, 120)
        : 'unknown',
    description: typeof raw.description === 'string' ? raw.description : '',
    code: typeof raw.code === 'string' ? raw.code : '',
    ...(css !== undefined ? { css } : {}),
    ...(js !== undefined ? { js } : {}),
  };
}

/**
 * Calls the configured OpenAI-compatible chat API to split prose vs code and infer language + pattern.
 */
export async function inferComponentFromPaste(raw: string): Promise<InferComponentResult> {
  const base = getLlmApiBaseUrl();
  if (!base) {
    throw new Error('LLM_API_URL is not set');
  }

  const url = resolveLlmUrl(CHAT_PATH);
  if (!url) {
    throw new Error('Could not resolve LLM chat URL');
  }

  const model = process.env.LLM_MODEL?.trim() || DEFAULT_MODEL;
  const body = {
    model,
    temperature: 0.1,
    messages: [
      { role: 'system' as const, content: SYSTEM_PROMPT },
      {
        role: 'user' as const,
        content: `Component source:\n\n${raw}`,
      },
    ],
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INFER_TIMEOUT_MS);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getLlmAuthHeaders(),
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`LLM HTTP ${res.status}: ${errText.slice(0, 500)}`);
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content;
    if (!content?.trim()) {
      throw new Error('Empty LLM response');
    }

    return normalizeResult(extractJsonObject(content));
  } finally {
    clearTimeout(timeout);
  }
}
