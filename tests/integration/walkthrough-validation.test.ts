/**
 * Integration test — exercises validateWalkthrough against the real LLM.
 *
 * Run with:  npm run test:integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';
import type { AnalysisResult } from '../../server/src/types/ittt.js';
import { createModel } from '../../server/src/lib/llm/config.js';
import { flushTracing } from '../../server/src/lib/llm/tracing.js';

let reachable = false;

beforeAll(async () => {
  try {
    const model = createModel('validation');
    const response = await model.invoke(
      [new HumanMessage('Say "ok"')],
    );
    await flushTracing();
    reachable = typeof response.content === 'string' && response.content.length > 0;
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  await flushTracing();
});

const SAMPLE_WALKTHROUGH: AnalysisResult = {
  component: { type: 'button', description: 'Submit button', confidence: 90 },
  automatedResults: { axeViolations: [], eslintMessages: [], customRuleFlags: [] },
  manualTests: [
    {
      id: 'keyboard-activation',
      title: 'Keyboard activation',
      wcagCriteria: ['2.1.1'],
      priority: 'critical',
      steps: [
        {
          action: 'Focus the button with Tab and press Enter',
          expected: 'Button activates and submits the form',
          ifFail: 'Button is not keyboard accessible — add keydown handler for Enter/Space',
        },
      ],
      sources: ['https://www.w3.org/WAI/WCAG22/Understanding/keyboard.html'],
    },
    {
      id: 'focus-visible',
      title: 'Focus visibility',
      wcagCriteria: ['2.4.7'],
      priority: 'critical',
      steps: [
        {
          action: 'Tab to the button',
          expected: 'A visible focus indicator appears around the button',
          ifFail: 'No visible focus ring — add :focus-visible styles',
        },
      ],
      sources: ['https://www.w3.org/WAI/WCAG22/Understanding/focus-visible.html'],
    },
  ],
  allClear: false,
  summary: 'Button needs keyboard activation and focus visibility testing.',
};

describe('walkthrough validation (integration)', () => {
  it('validates a walkthrough and returns a confidence score', async ({ skip }) => {
    if (!reachable) skip();

    const { validateWalkthrough } = await import(
      '../../server/src/lib/llm/walkthrough-validator.js'
    );

    const analysisResults = JSON.stringify({
      pattern: { type: 'button', confidence: 95 },
      axeViolations: [],
      eslintMessages: [],
      events: { hasClick: true, hasKeyDown: false },
    });

    const result = await validateWalkthrough(SAMPLE_WALKTHROUGH, analysisResults, 'button');

    // Verify structure matches ValidationResult
    expect(result).toHaveProperty('confidence');
    expect(typeof result.confidence).toBe('number');
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(100);

    expect(result).toHaveProperty('shouldLoop');
    expect(typeof result.shouldLoop).toBe('boolean');

    expect(result).toHaveProperty('issues');
    expect(Array.isArray(result.issues)).toBe(true);

    expect(result).toHaveProperty('missingTests');
    expect(Array.isArray(result.missingTests)).toBe(true);

    // Issues should have correct shape if present
    for (const issue of result.issues) {
      expect(issue).toHaveProperty('testId');
      expect(issue).toHaveProperty('severity');
      expect(['error', 'warning', 'info']).toContain(issue.severity);
      expect(issue).toHaveProperty('message');
    }
  });
});
