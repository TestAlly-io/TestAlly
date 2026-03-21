import { describe, it, expect, beforeEach } from 'vitest';
import { JobManager } from '../job-manager.js';
import { createAnalysisMachine } from '../analysis-machine.js';
import type { AnalysisInput } from '../../types/analysis.js';
import type { PhaseRunner } from '../phase-runner.js';
import type { LintInput } from '../runners/lint-runner.js';
import type { AnalyzeInput } from '../runners/analyze-runner.js';
import type { GenerateInput } from '../runners/generate-runner.js';
import type { ValidateInput, ValidationOutput } from '../runners/validate-runner.js';
import type { AutomatedResults, ComponentAnalysis } from '../../types/analysis.js';
import type { ManualTest } from '../../types/ittt.js';

const sampleInput: AnalysisInput = {
  code: '<div class="accordion">test</div>',
  language: 'html',
  description: 'Accordion component',
};

/** Pause for the microtask queue and pending promises to flush. */
function flush(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 50));
}

/** Build a JobManager backed by stub runners that resolve instantly. */
function makeManager(overrides?: {
  lint?: Partial<PhaseRunner<LintInput, AutomatedResults>>;
  analyze?: Partial<PhaseRunner<AnalyzeInput, ComponentAnalysis>>;
  generate?: Partial<PhaseRunner<GenerateInput, ManualTest[]>>;
  validate?: Partial<PhaseRunner<ValidateInput, ValidationOutput>>;
}): JobManager {
  const runners = {
    lint: {
      execute: async (): Promise<AutomatedResults> => ({
        axeViolations: [],
        eslintMessages: [],
        customRuleFlags: [],
      }),
      ...overrides?.lint,
    },
    analyze: {
      execute: async (): Promise<ComponentAnalysis> => ({
        patternType: 'accordion' as const,
        patternConfidence: 90,
        events: [],
        cssFlags: [],
        ariaFindings: [],
      }),
      ...overrides?.analyze,
    },
    generate: {
      execute: async (): Promise<ManualTest[]> => [],
      ...overrides?.generate,
    },
    validate: {
      execute: async (): Promise<ValidationOutput> => ({ confidence: 0.95, passed: true }),
      ...overrides?.validate,
    },
  };
  return new JobManager(runners);
}

describe('JobManager', () => {
  describe('createJob', () => {
    it('creates a job with initial state', () => {
      const manager = makeManager();
      const job = manager.createJob(sampleInput);

      expect(job).not.toBeNull();
      expect(job!.id).toMatch(/^job_/);
      // status starts as accepted (SUBMIT phase)
      expect(['accepted', 'in_progress']).toContain(job!.status);
    });

    it('returns null when at capacity', async () => {
      const manager = makeManager();
      // Fill capacity with jobs that won't complete quickly
      const neverResolve: PhaseRunner<LintInput, AutomatedResults> = {
        execute: () => new Promise(() => {}),
      };
      const blockingManager = new JobManager({
        lint: neverResolve,
        analyze: { execute: () => new Promise(() => {}) },
        generate: { execute: () => new Promise(() => {}) },
        validate: { execute: () => new Promise(() => {}) },
      });

      for (let i = 0; i < 10; i++) {
        blockingManager.createJob(sampleInput);
      }

      const overflow = blockingManager.createJob(sampleInput);
      expect(overflow).toBeNull();
    });
  });

  describe('pipeline auto-progression', () => {
    it('auto-progresses through all phases to COMPLETE', async () => {
      const manager = makeManager();
      const job = manager.createJob(sampleInput)!;

      await flush();

      expect(job.phase).toBe('COMPLETE');
      expect(job.status).toBe('completed');
      expect(job.completedAt).not.toBeNull();
      expect(job.result).not.toBeNull();
    });

    it('sets result.component from analyze output', async () => {
      const manager = makeManager();
      const job = manager.createJob(sampleInput)!;

      await flush();

      expect(job.result?.component.type).toBe('accordion');
      expect(job.result?.component.confidence).toBe(90);
    });

    it('does not require manual transitionTo calls', async () => {
      // Verify the pipeline runs without any external orchestration
      const manager = makeManager();
      const job = manager.createJob(sampleInput)!;

      // No transitionTo calls — job should still complete
      await flush();

      expect(job.status).toBe('completed');
    });
  });

  describe('gate condition', () => {
    it('hard-fails the job when a gate returns false', async () => {
      const manager = new JobManager({
        lint: {
          execute: async () => ({ axeViolations: [], eslintMessages: [], customRuleFlags: [] }),
          gate: () => false, // gate blocks LINT
        },
        analyze: { execute: async () => ({ patternType: 'unknown', patternConfidence: 0, events: [], cssFlags: [], ariaFindings: [] }) },
        generate: { execute: async () => [] },
        validate: { execute: async () => ({ confidence: 1.0, passed: true }) },
      });

      const job = manager.createJob(sampleInput)!;
      await flush();

      expect(job.status).toBe('failed');
      expect(job.failedAt).not.toBeNull();
      expect(job.errors[0]?.message).toMatch(/gate/i);
    });
  });

  describe('VALIDATE → ANALYZE loop', () => {
    it('loops back to ANALYZE when validation fails and iterations remain', async () => {
      let validateCallCount = 0;
      const manager = makeManager({
        validate: {
          execute: async (): Promise<ValidationOutput> => {
            validateCallCount++;
            // Fail on first call, pass on second
            return { confidence: 0.5, passed: validateCallCount > 1 };
          },
        },
      });

      const job = manager.createJob(sampleInput)!;
      await flush();

      expect(job.status).toBe('completed');
      expect(validateCallCount).toBe(2);
      expect(job.iterationCount).toBe(1);
    });

    it('fails the job when max iterations are exceeded', async () => {
      const manager = makeManager({
        validate: {
          execute: async (): Promise<ValidationOutput> => ({ confidence: 0.3, passed: false }),
        },
      });

      const job = manager.createJob(sampleInput)!;
      await flush();

      expect(job.status).toBe('failed');
      expect(job.errors[0]?.message).toMatch(/iteration/i);
    });
  });

  describe('phase failure', () => {
    it('fails the job when a phase runner throws', async () => {
      const manager = makeManager({
        lint: {
          execute: async () => {
            throw new Error('LLM unavailable');
          },
        },
      });

      const job = manager.createJob(sampleInput)!;
      await flush();

      expect(job.status).toBe('failed');
      expect(job.failedAt).not.toBeNull();
      expect(job.errors[0]?.message).toBe('LLM unavailable');
      expect(job.errors[0]?.phase).toBe('LINT');
    });
  });

  describe('getJob', () => {
    it('returns undefined for unknown ID', () => {
      const manager = makeManager();
      expect(manager.getJob('nonexistent')).toBeUndefined();
    });

    it('returns the job for a known ID', () => {
      const manager = makeManager();
      const job = manager.createJob(sampleInput)!;
      expect(manager.getJob(job.id)).toBe(job);
    });
  });
});
