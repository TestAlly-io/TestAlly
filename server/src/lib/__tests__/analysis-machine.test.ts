import { describe, it, expect, afterEach } from 'vitest';
import { createActor, waitFor } from 'xstate';
import {
  createAnalysisMachine,
  DEFAULT_CONFIDENCE_THRESHOLD,
  getConfidenceThreshold,
} from '../analysis-machine.js';
import type { AutomatedResults, ComponentAnalysis } from '../../types/analysis.js';
import type { PipelineRunners } from '../analysis-machine.js';
import type { GenerateValidateOutput } from '../runners/generate-validate-runner.js';

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
    generateValidate: {
      execute: async (): Promise<GenerateValidateOutput> => ({
        generatedTests: [],
        summary: '',
        validation: { confidence: 98, passed: true },
        iterationCount: 0,
      }),
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
    expect(snapshot.context.validationResult?.confidence).toBeGreaterThanOrEqual(DEFAULT_CONFIDENCE_THRESHOLD);
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

  it('populates iterationCount from generateValidate output', async () => {
    const machine = createAnalysisMachine(
      makeRunners({
        generateValidate: {
          execute: async (): Promise<GenerateValidateOutput> => ({
            generatedTests: [],
            summary: '',
            validation: { confidence: 72, passed: false, feedback: 'needs work' },
            iterationCount: 3,
          }),
        },
      }),
    );
    const actor = createActor(machine, { input: { analysisInput: sampleInput } });
    actor.start();

    const snapshot = await waitFor(actor, (s) => s.value === 'COMPLETE' || s.value === 'FAILED', { timeout: 1000 });

    expect(snapshot.value).toBe('COMPLETE');
    expect(snapshot.context.iterationCount).toBe(3);
    expect(snapshot.context.validationResult?.confidence).toBe(72);
  });

  it('reaches FAILED when generateValidate throws', async () => {
    const machine = createAnalysisMachine(
      makeRunners({
        generateValidate: {
          execute: async () => {
            throw new Error('agent crashed');
          },
        },
      }),
    );
    const actor = createActor(machine, { input: { analysisInput: sampleInput } });
    actor.start();

    const snapshot = await waitFor(actor, (s) => s.value === 'COMPLETE' || s.value === 'FAILED', { timeout: 1000 });

    expect(snapshot.value).toBe('FAILED');
    expect(snapshot.context.errors[0]?.message).toBe('agent crashed');
    expect(snapshot.context.errors[0]?.phase).toBe('GENERATE_VALIDATE');
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

describe('getConfidenceThreshold', () => {
  afterEach(() => {
    delete process.env.WALKTHROUGH_CONFIDENCE_THRESHOLD;
  });

  it('returns default when env var is not set', () => {
    delete process.env.WALKTHROUGH_CONFIDENCE_THRESHOLD;
    expect(getConfidenceThreshold()).toBe(DEFAULT_CONFIDENCE_THRESHOLD);
  });

  it('reads from WALKTHROUGH_CONFIDENCE_THRESHOLD env var', () => {
    process.env.WALKTHROUGH_CONFIDENCE_THRESHOLD = '80';
    expect(getConfidenceThreshold()).toBe(80);
  });

  it('returns default for invalid values', () => {
    process.env.WALKTHROUGH_CONFIDENCE_THRESHOLD = 'banana';
    expect(getConfidenceThreshold()).toBe(DEFAULT_CONFIDENCE_THRESHOLD);
  });

  it('returns default for out-of-range values', () => {
    process.env.WALKTHROUGH_CONFIDENCE_THRESHOLD = '150';
    expect(getConfidenceThreshold()).toBe(DEFAULT_CONFIDENCE_THRESHOLD);
  });
});
