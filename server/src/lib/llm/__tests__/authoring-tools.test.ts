import { describe, it, expect } from 'vitest';

describe('authoring-tools module', () => {
  it('exports createAuthoringTools function', async () => {
    const mod = await import('../authoring-tools.js');
    expect(typeof mod.createAuthoringTools).toBe('function');
  });

  it('creates 5 tools', async () => {
    const mod = await import('../authoring-tools.js');
    const tools = mod.createAuthoringTools({
      analysisInput: { code: '<div>test</div>', language: 'html' },
      analysisResult: {
        patternType: 'unknown',
        patternConfidence: 0,
        events: [],
        cssFlags: [],
        ariaFindings: [],
      },
      currentWalkthrough: null,
      currentValidation: null,
      iterationCount: 0,
    });
    expect(tools).toHaveLength(5);
  });

  it('tools have expected names', async () => {
    const mod = await import('../authoring-tools.js');
    const tools = mod.createAuthoringTools({
      analysisInput: { code: '<div>test</div>', language: 'html' },
      analysisResult: {
        patternType: 'unknown',
        patternConfidence: 0,
        events: [],
        cssFlags: [],
        ariaFindings: [],
      },
      currentWalkthrough: null,
      currentValidation: null,
      iterationCount: 0,
    });

    const names = tools.map((t) => t.name);
    expect(names).toContain('generate_walkthrough');
    expect(names).toContain('validate_walkthrough');
    expect(names).toContain('revise_section');
    expect(names).toContain('add_missing_test');
    expect(names).toContain('query_wcag_criteria');
  });
});
