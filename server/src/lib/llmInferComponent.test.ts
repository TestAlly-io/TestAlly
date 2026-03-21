import { describe, expect, it } from 'vitest';
import { stripReasoningTags } from './llmInferComponent.js';

describe('stripReasoningTags', () => {
  it('removes think wrapper and leaves JSON', () => {
    const open = '<' + 'think' + '>';
    const close = '</' + 'think' + '>';
    const raw = `${open}\nreasoning\n${close}\n{"language":"html","componentKind":"form","description":"x","code":""}`;
    const cleaned = stripReasoningTags(raw);
    expect(cleaned).toContain('"language":"html"');
    expect(cleaned).not.toContain('reasoning');
  });
});
