import { describe, it, expect, vi, afterEach } from 'vitest';
import { JobManager } from '../job-manager.js';
import type { AutomatedResults, ComponentAnalysis, AnalysisInput } from '../../types/analysis.js';
import type { ManualTest, TestStep } from '../../types/ittt.js';
import type { Job } from '../../types/job.js';
import type { GenerateValidateOutput } from '../runners/generate-validate-runner.js';
import type { PipelineRunners } from '../analysis-machine.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sampleInput: AnalysisInput = {
  code: '<button onClick={toggle} class="no-outline">Toggle</button>',
  language: 'jsx',
  description: 'Toggle button with suppressed focus ring',
};

function waitForDone(job: Job): Promise<void> {
  return vi.waitFor(
    () => {
      if (job.status !== 'completed' && job.status !== 'failed') {
        throw new Error(`still ${job.status}`);
      }
    },
    { timeout: 5000, interval: 10 },
  );
}

const stubLint = {
  execute: async (): Promise<AutomatedResults> => ({
    axeViolations: [],
    eslintMessages: [],
    customRuleFlags: [],
  }),
};

const stubAnalyze = {
  execute: async (): Promise<ComponentAnalysis> => ({
    patternType: 'toggle',
    patternConfidence: 92,
    events: [{ type: 'click', element: 'button' }],
    cssFlags: [{ property: 'outline', value: 'none', concern: 'Focus ring removed without visible replacement', wcagCriteria: ['2.4.7'] }],
    ariaFindings: [],
  }),
};

function makeStep(overrides?: Partial<TestStep>): TestStep {
  return {
    action: 'Press Tab to move focus to the button',
    expected: 'A visible focus indicator appears around the button',
    ifFail: 'Focus indicator is missing — violates SC 2.4.7',
    ...overrides,
  };
}

function makeTest(overrides?: Partial<ManualTest>): ManualTest {
  return {
    id: 'test-focus-ring',
    title: 'Focus visibility on toggle button',
    wcagCriteria: ['2.4.7'],
    priority: 'critical',
    steps: [makeStep()],
    sources: ['axe-core', 'custom-rule:focus-ring-removal'],
    ...overrides,
  };
}

function makeRunners(
  generateValidateOverride: PipelineRunners['generateValidate'],
): PipelineRunners {
  return {
    lint: stubLint,
    analyze: stubAnalyze,
    generateValidate: generateValidateOverride,
  };
}

// ---------------------------------------------------------------------------
// Integration: agentic GENERATE_VALIDATE phase
// ---------------------------------------------------------------------------

describe('agentic GENERATE_VALIDATE phase (integration)', () => {
  afterEach(() => {
    delete process.env.WALKTHROUGH_CONFIDENCE_THRESHOLD;
  });

  it('completes on first pass when runner returns high confidence', async () => {
    const manager = new JobManager(
      makeRunners({
        execute: async (): Promise<GenerateValidateOutput> => ({
          generatedTests: [makeTest()],
          summary: '',
          validation: { confidence: 97, passed: true },
          iterationCount: 1,
        }),
      }),
    );

    const job = manager.createJob(sampleInput)!;
    await waitForDone(job);

    expect(job.status).toBe('completed');
    expect(job.phase).toBe('COMPLETE');
    expect(job.iterationCount).toBe(1);
    expect(job.result).not.toBeNull();
    expect(job.result!.manualTests).toHaveLength(1);
  });

  it('reports multiple iterations from the agent', async () => {
    const manager = new JobManager(
      makeRunners({
        execute: async (): Promise<GenerateValidateOutput> => ({
          generatedTests: [
            makeTest(),
            makeTest({ id: 'test-keyboard-activation', title: 'Keyboard activation' }),
          ],
          summary: '',
          validation: { confidence: 96, passed: true },
          iterationCount: 3,
        }),
      }),
    );

    const job = manager.createJob(sampleInput)!;
    await waitForDone(job);

    expect(job.status).toBe('completed');
    expect(job.iterationCount).toBe(3);
    expect(job.result!.manualTests).toHaveLength(2);
  });

  it('completes with low confidence when agent exhausts iterations', async () => {
    const manager = new JobManager(
      makeRunners({
        execute: async (): Promise<GenerateValidateOutput> => ({
          generatedTests: [makeTest()],
          summary: '',
          validation: { confidence: 60, passed: false, feedback: 'Still needs improvement' },
          iterationCount: 5,
        }),
      }),
    );

    const job = manager.createJob(sampleInput)!;
    await waitForDone(job);

    // Should NOT fail — completes with the best available result
    expect(job.status).toBe('completed');
    expect(job.phase).toBe('COMPLETE');
    expect(job.iterationCount).toBe(5);
    expect(job.result).not.toBeNull();
    expect(job.result!.manualTests).toHaveLength(1);
  });

  it('fails the job when generateValidate runner throws', async () => {
    const manager = new JobManager(
      makeRunners({
        execute: async () => {
          throw new Error('Agent failed to produce output');
        },
      }),
    );

    const job = manager.createJob(sampleInput)!;
    await waitForDone(job);

    expect(job.status).toBe('failed');
    expect(job.errors[0]?.message).toBe('Agent failed to produce output');
    expect(job.errors[0]?.phase).toBe('GENERATE_VALIDATE');
  });

  it('quality improvement is reflected in accumulated tests from agent output', async () => {
    const manager = new JobManager(
      makeRunners({
        execute: async (): Promise<GenerateValidateOutput> => ({
          generatedTests: [
            makeTest(),
            makeTest({ id: 'test-keyboard', title: 'Keyboard activation', wcagCriteria: ['2.1.1'] }),
            makeTest({ id: 'test-sr', title: 'Screen reader announcement', wcagCriteria: ['4.1.2'] }),
          ],
          summary: '',
          validation: { confidence: 97, passed: true },
          iterationCount: 3,
        }),
      }),
    );

    const job = manager.createJob(sampleInput)!;
    await waitForDone(job);

    expect(job.status).toBe('completed');
    expect(job.result!.manualTests).toHaveLength(3);
    expect(job.result!.manualTests.map((t) => t.id)).toEqual(
      expect.arrayContaining(['test-focus-ring', 'test-keyboard', 'test-sr']),
    );
  });

  it('pipeline transitions through GENERATE_VALIDATE phase', async () => {
    const phases: string[] = [];
    let resolveRunner: ((v: GenerateValidateOutput) => void) | null = null;

    const manager = new JobManager(
      makeRunners({
        execute: () =>
          new Promise<GenerateValidateOutput>((resolve) => {
            resolveRunner = resolve;
          }),
      }),
    );

    const job = manager.createJob(sampleInput)!;

    // Wait for the job to reach GENERATE_VALIDATE
    await vi.waitFor(() => {
      if (job.phase !== 'GENERATE_VALIDATE') throw new Error(`still ${job.phase}`);
    }, { timeout: 1000 });

    expect(job.phase).toBe('GENERATE_VALIDATE');
    expect(job.status).toBe('in_progress');

    // Complete the runner
    resolveRunner!({
      generatedTests: [makeTest()],
      summary: '',
      validation: { confidence: 98, passed: true },
      iterationCount: 1,
    });

    await waitForDone(job);
    expect(job.phase).toBe('COMPLETE');
    expect(job.status).toBe('completed');
  });
});
