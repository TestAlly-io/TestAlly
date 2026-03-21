/**
 * Integration test — exercises generateWalkthrough against the real LLM.
 *
 * Run with:  npm run test:integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';
import { createModel } from '../../server/src/lib/llm/config.js';
import { flushTracing } from '../../server/src/lib/llm/tracing.js';

let reachable = false;

beforeAll(async () => {
  try {
    const model = createModel('generation');
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

describe('walkthrough generation (integration)', () => {
  it('generates a valid walkthrough for a simple button component', async ({ skip }) => {
    if (!reachable) skip();

    const { generateWalkthrough } = await import(
      '../../server/src/lib/llm/walkthrough-generator.js'
    );

    const analysisResults = JSON.stringify({
      pattern: { type: 'button', confidence: 95 },
      axeViolations: [],
      eslintMessages: [],
      customRuleFlags: [],
      events: { hasClick: true, hasKeyDown: false },
      css: { flags: [], hasAnimations: false, hasReducedMotionQuery: false },
      aria: { roles: ['button'], attributes: ['aria-label'] },
    });

    const result = await generateWalkthrough(analysisResults, 'button', 'A submit button');

    // Verify structure matches AnalysisResult
    expect(result).toHaveProperty('component');
    expect(result.component).toHaveProperty('type');
    expect(result.component).toHaveProperty('confidence');
    expect(result).toHaveProperty('manualTests');
    expect(Array.isArray(result.manualTests)).toBe(true);
    expect(result).toHaveProperty('summary');
    expect(typeof result.summary).toBe('string');
    expect(result).toHaveProperty('allClear');
    expect(typeof result.allClear).toBe('boolean');

    // Should produce at least one manual test
    if (!result.allClear) {
      expect(result.manualTests.length).toBeGreaterThan(0);
      const firstTest = result.manualTests[0];
      expect(firstTest).toHaveProperty('id');
      expect(firstTest).toHaveProperty('title');
      expect(firstTest).toHaveProperty('wcagCriteria');
      expect(firstTest).toHaveProperty('steps');
      expect(Array.isArray(firstTest.steps)).toBe(true);

      // Each step should be ITTT format
      if (firstTest.steps.length > 0) {
        const step = firstTest.steps[0];
        expect(step).toHaveProperty('action');
        expect(step).toHaveProperty('expected');
        expect(step).toHaveProperty('ifFail');
      }
    }
  });
});
