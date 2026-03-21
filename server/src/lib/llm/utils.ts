/**
 * Extract a JSON object or array from an LLM response that may contain
 * markdown code fences or surrounding prose.
 */
export function extractJson(content: string): unknown {
  // 1. Try fenced code block (```json ... ``` or ``` ... ```)
  const fenceRegex = /```(?:json)?\s*\n?([\s\S]*?)```/;
  const fenceMatch = fenceRegex.exec(content);
  if (fenceMatch) {
    const parsed = tryParse(fenceMatch[1].trim());
    if (parsed !== undefined) return parsed;
  }

  // 2. Try the entire content as JSON
  const directParse = tryParse(content.trim());
  if (directParse !== undefined) return directParse;

  // 3. Find the first { ... } or [ ... ] block
  const braceStart = content.indexOf('{');
  const bracketStart = content.indexOf('[');

  let start: number;
  let open: string;
  let close: string;

  if (braceStart === -1 && bracketStart === -1) {
    throw new Error('No JSON found in LLM response');
  } else if (braceStart === -1) {
    start = bracketStart;
    open = '[';
    close = ']';
  } else if (bracketStart === -1) {
    start = braceStart;
    open = '{';
    close = '}';
  } else if (braceStart < bracketStart) {
    start = braceStart;
    open = '{';
    close = '}';
  } else {
    start = bracketStart;
    open = '[';
    close = ']';
  }

  // Walk forward matching braces/brackets
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = start; i < content.length; i++) {
    const ch = content[i];

    if (escape) {
      escape = false;
      continue;
    }

    if (ch === '\\' && inString) {
      escape = true;
      continue;
    }

    if (ch === '"') {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (ch === open) depth++;
    else if (ch === close) depth--;

    if (depth === 0) {
      const candidate = content.slice(start, i + 1);
      const parsed = tryParse(candidate);
      if (parsed !== undefined) return parsed;
      break;
    }
  }

  throw new Error('No valid JSON found in LLM response');
}

function tryParse(text: string): unknown | undefined {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}
