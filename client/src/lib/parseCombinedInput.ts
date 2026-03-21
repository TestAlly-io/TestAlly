import type { AnalyzeRequest } from '../types/api';

const FENCE_RE = /^```([\w+-]*)\s*\r?\n([\s\S]*?)^```\s*/m;
const CODE_DELIM = /\n---CODE---\s*\r?\n/i;

/** Single pass: enough for typical escaped snippets from chat/docs. */
function decodeMinimalHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'");
}

export interface ParsedCombinedInput {
  description: string;
  code: string;
  language: AnalyzeRequest['language'];
}

/**
 * Single-box input: optional markdown code block (```lang … ```) or `---CODE---` delimiter,
 * else whole paste treated as code when it looks like markup/source. Language from the
 * opening line when present, else inferred from code.
 */
export function parseCombinedInput(raw: string): ParsedCombinedInput {
  let text = raw.replace(/\r\n/g, '\n').trim();
  if (!text) {
    return { description: '', code: '', language: 'html' };
  }

  // Rich-text / Word-style copy sometimes uses fullwidth angle brackets.
  text = text.replace(/\uFF1C/g, '<').replace(/\uFF1E/g, '>');

  // Escaped markup (e.g. pasted from rendered pages) has no raw `<` until decoded.
  if (!/[<{]/.test(text) && /&lt;\s*\/?[a-z!?]/i.test(text)) {
    text = decodeMinimalHtmlEntities(text);
  }

  const fenceMatch = text.match(FENCE_RE);
  if (fenceMatch) {
    const fenceLang = (fenceMatch[1] || '').toLowerCase().replace(/^(\w+).*/, '$1');
    const code = fenceMatch[2].trim();
    const before = text.slice(0, fenceMatch.index).trim();
    const after = text.slice((fenceMatch.index ?? 0) + fenceMatch[0].length).trim();
    const description = [before, after].filter(Boolean).join('\n\n').trim();
    return {
      description,
      code,
      language: mapFenceLang(fenceLang) ?? detectLanguage(code),
    };
  }

  const delimParts = text.split(CODE_DELIM);
  if (delimParts.length >= 2) {
    const description = delimParts[0].trim();
    const code = delimParts.slice(1).join('\n---CODE---\n').trim();
    return {
      description,
      code,
      language: detectLanguage(code),
    };
  }

  const looksLikeMarkupOrCode =
    /<\/?[a-z!?]/i.test(text) ||
    /[<{]/.test(text) ||
    /^\s*import\s/.test(text) ||
    /^\s*export\s/.test(text) ||
    /className/.test(text) ||
    /function\s+\w+\s*\(/.test(text);
  if (looksLikeMarkupOrCode) {
    return { description: '', code: text, language: detectLanguage(text) };
  }

  return { description: text, code: '', language: 'html' };
}

/** Source-only: reject prose outside extracted code (markdown block or ---CODE---). */
export function validateComponentSourceOnly(
  paste: string,
): { ok: true; source: string } | { ok: false; message: string } {
  const trimmed = paste.trim();
  if (!trimmed) {
    return { ok: false, message: 'Paste component source to analyze.' };
  }

  const parsed = parseCombinedInput(trimmed);

  const source = parsed.code.trim();
  if (!source) {
    return {
      ok: false,
      message:
        'No component source detected. Paste your HTML/JSX/TSX/Vue/Svelte directly, or a single markdown code block that contains only the component.',
    };
  }

  if (parsed.description.trim().length > 0) {
    return {
      ok: false,
      message:
        'Use only component source in this box — no notes above or below the code. If you use a markdown code block or a ---CODE--- line, put nothing but code inside (no surrounding commentary).',
    };
  }

  return { ok: true, source };
}

function mapFenceLang(tag: string): AnalyzeRequest['language'] | undefined {
  if (!tag) return undefined;
  if (tag === 'ts' || tag === 'typescript') return 'tsx';
  if (tag === 'js' || tag === 'javascript') return 'jsx';
  if (tag === 'html' || tag === 'htm') return 'html';
  if (tag === 'tsx') return 'tsx';
  if (tag === 'jsx') return 'jsx';
  if (tag === 'vue') return 'vue';
  if (tag === 'svelte') return 'svelte';
  return undefined;
}

/** Best-effort detection from snippet text (no AST). */
export function detectLanguage(code: string): AnalyzeRequest['language'] {
  const s = code.trim();
  if (!s) return 'html';

  if (/<template[\s>]/.test(s) || /\blang\s*=\s*["']vue["']/.test(s)) return 'vue';
  if (/<svelte:component|<script\s+[^>]*lang\s*=\s*["']ts["']/.test(s) || /\.svelte\b/.test(s))
    return 'svelte';

  const isLikelyTs =
    /:\s*(string|number|boolean|void|unknown)\b/.test(s) ||
    /\binterface\s+\w+/.test(s) ||
    /\btype\s+\w+\s*=/.test(s) ||
    /\.tsx?\b/.test(s);

  if (/import\s+type\b|\bsatisfies\s+/.test(s) || (isLikelyTs && /<\w+/.test(s))) return 'tsx';
  if (/className=|import\s+React\b|from\s+['"]react['"]/.test(s)) return isLikelyTs ? 'tsx' : 'jsx';

  if (/^\s*</.test(s) || /<!DOCTYPE/i.test(s)) return 'html';

  return 'html';
}
