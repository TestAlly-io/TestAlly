import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  GENERATION_SYSTEM_PROMPT,
  GENERATION_USER_PROMPT,
  OUTPUT_SCHEMA,
} from '../prompts/generation.js';

// Mock createModel so we don't need real API keys
vi.mock('../config.js', () => ({
  createModel: vi.fn(),
  getModelName: vi.fn(() => 'mock-model'),
}));

describe('walkthrough-generator prompts', () => {
  it('GENERATION_SYSTEM_PROMPT is a non-empty string', () => {
    expect(typeof GENERATION_SYSTEM_PROMPT).toBe('string');
    expect(GENERATION_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it('GENERATION_SYSTEM_PROMPT mentions WCAG', () => {
    expect(GENERATION_SYSTEM_PROMPT).toContain('WCAG');
  });

  it('GENERATION_SYSTEM_PROMPT mentions ITTT format', () => {
    expect(GENERATION_SYSTEM_PROMPT.toLowerCase()).toContain('if-this-then-that');
  });

  it('GENERATION_USER_PROMPT contains all expected placeholders', () => {
    expect(GENERATION_USER_PROMPT).toContain('{componentType}');
    expect(GENERATION_USER_PROMPT).toContain('{description}');
    expect(GENERATION_USER_PROMPT).toContain('{analysisResults}');
    expect(GENERATION_USER_PROMPT).toContain('{wcagContext}');
    expect(GENERATION_USER_PROMPT).toContain('{atGuides}');
    expect(GENERATION_USER_PROMPT).toContain('{manualTestingRef}');
    expect(GENERATION_USER_PROMPT).toContain('{outputSchema}');
  });

  it('OUTPUT_SCHEMA defines required fields', () => {
    expect(OUTPUT_SCHEMA.required).toContain('component');
    expect(OUTPUT_SCHEMA.required).toContain('manualTests');
    expect(OUTPUT_SCHEMA.required).toContain('allClear');
    expect(OUTPUT_SCHEMA.required).toContain('summary');
  });
});

describe('generateWalkthrough', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls model and returns parsed result', async () => {
    const mockResult = {
      component: { type: 'button', description: 'A button', confidence: 90 },
      automatedResults: { axeViolations: [], eslintMessages: [], customRuleFlags: [] },
      manualTests: [],
      allClear: true,
      summary: 'No issues found.',
    };

    const { createModel } = await import('../config.js');
    vi.mocked(createModel).mockReturnValue({
      invoke: vi.fn().mockResolvedValue({ content: JSON.stringify(mockResult) }),
    } as never);

    const { generateWalkthrough } = await import('../walkthrough-generator.js');
    const result = await generateWalkthrough('no issues', 'button', 'A simple button');
    expect(result.component.type).toBe('button');
    expect(result.allClear).toBe(true);
    expect(result.summary).toBe('No issues found.');
  });

  it('retries on parse failure then succeeds', async () => {
    const mockResult = {
      component: { type: 'modal', description: 'Dialog', confidence: 80 },
      automatedResults: { axeViolations: [], eslintMessages: [], customRuleFlags: [] },
      manualTests: [],
      allClear: false,
      summary: 'Issues found.',
    };

    const invokeMock = vi
      .fn()
      .mockResolvedValueOnce({ content: 'not json at all' })
      .mockResolvedValueOnce({ content: JSON.stringify(mockResult) });

    const { createModel } = await import('../config.js');
    vi.mocked(createModel).mockReturnValue({ invoke: invokeMock } as never);

    const { generateWalkthrough } = await import('../walkthrough-generator.js');
    const result = await generateWalkthrough('issues', 'modal', 'A dialog');
    expect(invokeMock).toHaveBeenCalledTimes(2);
    expect(result.component.type).toBe('modal');
  });

  it('throws after exhausting retries', async () => {
    const invokeMock = vi.fn().mockResolvedValue({ content: 'garbage' });

    const { createModel } = await import('../config.js');
    vi.mocked(createModel).mockReturnValue({ invoke: invokeMock } as never);

    const { generateWalkthrough } = await import('../walkthrough-generator.js');
    await expect(generateWalkthrough('data', 'form', 'A form')).rejects.toThrow(
      'failed after',
    );
    expect(invokeMock).toHaveBeenCalledTimes(3); // initial + 2 retries
  });
});
