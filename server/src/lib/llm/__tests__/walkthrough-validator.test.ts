import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  VALIDATION_SYSTEM_PROMPT,
  VALIDATION_USER_PROMPT,
  VALIDATION_SCHEMA,
} from '../prompts/validation.js';
import type { AnalysisResult } from '../../../types/ittt.js';

// Mock createModel
vi.mock('../config.js', () => ({
  createModel: vi.fn(),
  getModelName: vi.fn(() => 'mock-validation-model'),
}));

const SAMPLE_WALKTHROUGH: AnalysisResult = {
  component: { type: 'button', description: 'A button', confidence: 90 },
  automatedResults: { axeViolations: [], eslintMessages: [], customRuleFlags: [] },
  manualTests: [
    {
      id: 'test-1',
      title: 'Keyboard activation',
      wcagCriteria: ['2.1.1'],
      priority: 'critical',
      steps: [
        {
          action: 'Press Enter on the button',
          expected: 'Button activates',
          ifFail: 'Button is not keyboard accessible — add keyboard event handler',
        },
      ],
      sources: ['https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html'],
    },
  ],
  allClear: false,
  summary: 'One manual test generated.',
};

describe('walkthrough-validator prompts', () => {
  it('VALIDATION_SYSTEM_PROMPT is a non-empty string', () => {
    expect(typeof VALIDATION_SYSTEM_PROMPT).toBe('string');
    expect(VALIDATION_SYSTEM_PROMPT.length).toBeGreaterThan(100);
  });

  it('VALIDATION_SYSTEM_PROMPT mentions confidence scoring', () => {
    expect(VALIDATION_SYSTEM_PROMPT).toContain('confidence');
    expect(VALIDATION_SYSTEM_PROMPT).toContain('0-100');
  });

  it('VALIDATION_USER_PROMPT contains all expected placeholders', () => {
    expect(VALIDATION_USER_PROMPT).toContain('{componentType}');
    expect(VALIDATION_USER_PROMPT).toContain('{analysisResults}');
    expect(VALIDATION_USER_PROMPT).toContain('{walkthrough}');
    expect(VALIDATION_USER_PROMPT).toContain('{validationSchema}');
  });

  it('VALIDATION_SCHEMA defines required fields', () => {
    expect(VALIDATION_SCHEMA.required).toContain('confidence');
    expect(VALIDATION_SCHEMA.required).toContain('shouldLoop');
    expect(VALIDATION_SCHEMA.required).toContain('issues');
    expect(VALIDATION_SCHEMA.required).toContain('missingTests');
  });
});

describe('validateWalkthrough', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns parsed validation result on success', async () => {
    const mockValidation = {
      confidence: 85,
      shouldLoop: false,
      issues: [],
      missingTests: [],
    };

    const { createModel } = await import('../config.js');
    vi.mocked(createModel).mockReturnValue({
      invoke: vi.fn().mockResolvedValue({ content: JSON.stringify(mockValidation) }),
    } as never);

    const { validateWalkthrough } = await import('../walkthrough-validator.js');
    const result = await validateWalkthrough(SAMPLE_WALKTHROUGH, 'analysis data', 'button');
    expect(result.confidence).toBe(85);
    expect(result.shouldLoop).toBe(false);
  });

  it('returns fallback result when all retries fail', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const invokeMock = vi.fn().mockResolvedValue({ content: 'not json' });

    const { createModel } = await import('../config.js');
    vi.mocked(createModel).mockReturnValue({ invoke: invokeMock } as never);

    const { validateWalkthrough } = await import('../walkthrough-validator.js');
    const result = await validateWalkthrough(SAMPLE_WALKTHROUGH, 'data', 'button');
    expect(result.confidence).toBe(30);
    expect(result.shouldLoop).toBe(false);
    expect(invokeMock).toHaveBeenCalledTimes(3);
  });

  it('returns fallback when provider is not configured', async () => {
    const { createModel } = await import('../config.js');
    vi.mocked(createModel).mockImplementation(() => {
      throw new Error('Missing API key');
    });

    const { validateWalkthrough } = await import('../walkthrough-validator.js');
    const result = await validateWalkthrough(SAMPLE_WALKTHROUGH, 'data', 'button');
    expect(result.confidence).toBe(30);
    expect(result.shouldLoop).toBe(false);
    expect(result.feedback).toContain('not configured');
  });

  it('returns issues and missing tests when present', async () => {
    const mockValidation = {
      confidence: 55,
      shouldLoop: true,
      issues: [
        { testId: 'test-1', severity: 'warning', message: 'Step could be more specific' },
      ],
      missingTests: [
        {
          wcagCriteria: '4.1.2',
          description: 'ARIA role test',
          reason: 'No test for role attribute',
        },
      ],
      feedback: 'Add ARIA role verification test.',
    };

    const { createModel } = await import('../config.js');
    vi.mocked(createModel).mockReturnValue({
      invoke: vi.fn().mockResolvedValue({ content: JSON.stringify(mockValidation) }),
    } as never);

    const { validateWalkthrough } = await import('../walkthrough-validator.js');
    const result = await validateWalkthrough(SAMPLE_WALKTHROUGH, 'data', 'button');
    expect(result.confidence).toBe(55);
    expect(result.shouldLoop).toBe(true);
    expect(result.issues).toHaveLength(1);
    expect(result.missingTests).toHaveLength(1);
    expect(result.feedback).toContain('ARIA');
  });
});
