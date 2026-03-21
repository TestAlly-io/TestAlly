import { describe, it, expect } from 'vitest';
import { createActor, waitFor } from 'xstate';
import { createAnalysisMachine, MAX_ITERATIONS } from '../analysis-machine.js';
import type { AutomatedResults, ComponentAnalysis } from '../../types/analysis.js';
import type { ManualTest } from '../../types/ittt.js';
import type { ValidationOutput } from '../runners/validate-runner.js';
import type { PipelineRunners } from '../analysis-machine.js';

const sampleInput = {
  code: '<div role="tablist">tabs</div>',
  language: 'html' as const,
  description: 'Tab component',
};

function makeRunners(overrides?: Partial<PipelineRunners>): PipelineRunners {
  return {
    lint: {
      execute: async (): Promise<AutomatedResults> => ({
        axeViolations: [],
        eslintMessages: [],
        customRuleFlags: [],
      }),
    },
    analyze: {
      execute: async (): Promise<ComponentAnalysis> => ({
        patternType: 'tabs',
        patternConfidence: 85,
        events: [],
        cssFlags: [],
        ariaFindings: [],
      }),
    },
    generate: {
      execute: async (): Promise<ManualTest[]> => [],
    },
    validate: {
      execute: async (): Promise<ValidationOutput> => ({ confidence: 0.9, passed: true }),
    },
    ...overrides,
  };
}

describe('analysisMachine', () => {
  it('reaches COMPLETE with passing runners', async () => {
    const machine = createAnalysisMachine(makeRunners());
    const actor = createActor(machine, { input: { analysisInput: sampleInput } });
    actor.start();

    const snapshot = await waitFor(actor, (s) => s.value === 'COMPLETE' || s.value === 'FAILED', { timeout: 1000 });

    expect(snapshot.value).toBe('COMPLETE');
    expect(snapshot.context.analysisResult?.patternType).toBe('tabs');
    expect(snapshot.context.lintResult).not.toBeNull();
    expect(snapshot.context.generatedTests).not.toBeNull();
    expect(snapshot.context.validationResult?.passed).toBe(true);
  });

  it('reaches FAILED when a runner throws', async () => {
    const machine = createAnalysisMachine(
      makeRunners({
        analyze: {
          execute: async () => {
            throw new Error('analyze exploded');
          },
        },
      }),
    );
    const actor = createActor(machine, { input: { analysisInput: sampleInput } });
    actor.start();

    const snapshot = await waitFor(actor, (s) => s.value === 'COMPLETE' || s.value === 'FAILED', { timeout: 1000 });

    expect(snapshot.value).toBe('FAILED');
    expect(snapshot.context.errors[0]?.message).toBe('analyze exploded');
    expect(snapshot.context.errors[0]?.phase).toBe('ANALYZE');
  });

  it('reaches FAILED when a gate blocks', async () => {
    const machine = createAnalysisMachine(
      makeRunners({
        lint: {
          execute: async () => ({ axeViolations: [], eslintMessages: [], customRuleFlags: [] }),
          gate: () => false,
        },
      }),
    );
    const actor = createActor(machine, { input: { analysisInput: sampleInput } });
    actor.start();

    const snapshot = await waitFor(actor, (s) => s.value === 'COMPLETE' || s.value === 'FAILED', { timeout: 1000 });

    expect(snapshot.value).toBe('FAILED');
    expect(snapshot.context.errors[0]?.message).toMatch(/gate/i);
  });

  it('loops VALIDATE → ANALYZE up to MAX_ITERATIONS then fails', async () => {
    let validateCalls = 0;
    const machine = createAnalysisMachine(
      makeRunners({
        validate: {
          execute: async (): Promise<ValidationOutput> => {
            validateCalls++;
            return { confidence: 0.3, passed: false };
          },
        },
      }),
    );
    const actor = createActor(machine, { input: { analysisInput: sampleInput } });
    actor.start();

    const snapshot = await waitFor(actor, (s) => s.value === 'COMPLETE' || s.value === 'FAILED', { timeout: 1000 });

    expect(snapshot.value).toBe('FAILED');
    // Initial call + MAX_ITERATIONS retries = 1 + MAX_ITERATIONS
    expect(validateCalls).toBe(1 + MAX_ITERATIONS);
    expect(snapshot.context.iterationCount).toBe(MAX_ITERATIONS);
    expect(snapshot.context.errors[0]?.message).toMatch(/iteration/i);
  });

  it('recovers on retry when second validation passes', async () => {
    let validateCalls = 0;
    const machine = createAnalysisMachine(
      makeRunners({
        validate: {
          execute: async (): Promise<ValidationOutput> => {
            validateCalls++;
            return { confidence: validateCalls > 1 ? 0.95 : 0.4, passed: validateCalls > 1 };
          },
        },
      }),
    );
    const actor = createActor(machine, { input: { analysisInput: sampleInput } });
    actor.start();

    const snapshot = await waitFor(actor, (s) => s.value === 'COMPLETE' || s.value === 'FAILED', { timeout: 1000 });

    expect(snapshot.value).toBe('COMPLETE');
    expect(validateCalls).toBe(2);
    expect(snapshot.context.iterationCount).toBe(1);
  });

  it('preserves context across the full pipeline', async () => {
    const machine = createAnalysisMachine(makeRunners());
    const actor = createActor(machine, { input: { analysisInput: sampleInput } });
    actor.start();

    const snapshot = await waitFor(actor, (s) => s.value === 'COMPLETE', { timeout: 1000 });

    expect(snapshot.context.input).toEqual(sampleInput);
    expect(snapshot.context.iterationCount).toBe(0);
    expect(snapshot.context.errors).toEqual([]);
  });
});
