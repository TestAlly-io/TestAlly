import { describe, it, expect, vi } from 'vitest';
import { JobManager } from '../job-manager.js';
import type { AnalysisInput, AutomatedResults, ComponentAnalysis } from '../../types/analysis.js';
import type { Job } from '../../types/job.js';
import type { PipelineRunners } from '../analysis-machine.js';
import type { GenerateValidateOutput } from '../runners/generate-validate-runner.js';

const sampleInput: AnalysisInput = {
  code: '<div class="accordion">test</div>',
  language: 'html',
  description: 'Accordion component',
};

/** Wait until a job reaches a terminal state (completed or failed). */
function waitForDone(job: Job): Promise<void> {
  return vi.waitFor(
    () => {
      if (job.status !== 'completed' && job.status !== 'failed') {
        throw new Error(`still ${job.status}`);
      }
    },
    { timeout: 2000, interval: 10 },
  );
}

/** Build a JobManager backed by stub runners that resolve instantly. */
function makeManager(overrides?: Partial<PipelineRunners>): JobManager {
  const runners: PipelineRunners = {
    lint: {
      execute: async (): Promise<AutomatedResults> => ({
        axeViolations: [],
        eslintMessages: [],
        customRuleFlags: [],
      }),
    },
    analyze: {
      execute: async (): Promise<ComponentAnalysis> => ({
        patternType: 'accordion' as const,
        patternConfidence: 90,
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
      // Fill capacity with jobs that won't complete quickly
      const blockingManager = new JobManager({
        lint: { execute: () => new Promise(() => {}) },
        analyze: { execute: () => new Promise(() => {}) },
        generateValidate: { execute: () => new Promise(() => {}) },
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

      await waitForDone(job);

      expect(job.phase).toBe('COMPLETE');
      expect(job.status).toBe('completed');
      expect(job.completedAt).not.toBeNull();
      expect(job.result).not.toBeNull();
    });

    it('sets result.component from analyze output', async () => {
      const manager = makeManager();
      const job = manager.createJob(sampleInput)!;

      await waitForDone(job);

      expect(job.result?.component.type).toBe('accordion');
      expect(job.result?.component.confidence).toBe(90);
    });

    it('does not require manual transitionTo calls', async () => {
      // Verify the pipeline runs without any external orchestration
      const manager = makeManager();
      const job = manager.createJob(sampleInput)!;

      // No transitionTo calls — job should still complete
      await waitForDone(job);

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
        generateValidate: { execute: async () => ({ generatedTests: [], summary: '', validation: { confidence: 100, passed: true }, iterationCount: 0 }) },
      });

      const job = manager.createJob(sampleInput)!;
      await waitForDone(job);

      expect(job.status).toBe('failed');
      expect(job.failedAt).not.toBeNull();
      expect(job.errors[0]?.message).toMatch(/gate/i);
    });
  });

  describe('generateValidate phase', () => {
    it('populates iterationCount from runner output', async () => {
      const manager = makeManager({
        generateValidate: {
          execute: async (): Promise<GenerateValidateOutput> => ({
            generatedTests: [
              { id: 'test-1', title: 'Focus test', wcagCriteria: ['2.4.7'], priority: 'critical', steps: [{ action: 'Tab', expected: 'Focus ring', ifFail: 'No focus' }], sources: [] },
            ],
            summary: '',
            validation: { confidence: 96, passed: true },
            iterationCount: 2,
          }),
        },
      });

      const job = manager.createJob(sampleInput)!;
      await waitForDone(job);

      expect(job.status).toBe('completed');
      expect(job.iterationCount).toBe(2);
      expect(job.result!.manualTests).toHaveLength(1);
    });

    it('fails the job when generateValidate throws', async () => {
      const manager = makeManager({
        generateValidate: {
          execute: async () => {
            throw new Error('LLM unavailable');
          },
        },
      });

      const job = manager.createJob(sampleInput)!;
      await waitForDone(job);

      expect(job.status).toBe('failed');
      expect(job.failedAt).not.toBeNull();
      expect(job.errors[0]?.message).toBe('LLM unavailable');
      expect(job.errors[0]?.phase).toBe('GENERATE_VALIDATE');
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
      await waitForDone(job);

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

  describe('cancelJob', () => {
    it('stops a running job and marks it as failed', async () => {
      // Use a runner that never resolves to keep the job in-progress
      const manager = new JobManager({
        lint: { execute: () => new Promise(() => {}) },
        analyze: { execute: () => new Promise(() => {}) },
        generateValidate: { execute: () => new Promise(() => {}) },
      });

      const job = manager.createJob(sampleInput)!;
      expect(job.status).not.toBe('completed');

      const cancelled = manager.cancelJob(job.id);
      expect(cancelled).toBe(true);
      expect(job.status).toBe('failed');
      expect(job.errors[0]?.message).toMatch(/cancel/i);
    });

    it('returns false for unknown job ID', () => {
      const manager = makeManager();
      expect(manager.cancelJob('nonexistent')).toBe(false);
    });

    it('returns false for already-completed job', async () => {
      const manager = makeManager();
      const job = manager.createJob(sampleInput)!;
      await waitForDone(job);

      expect(job.status).toBe('completed');
      expect(manager.cancelJob(job.id)).toBe(false);
    });

    it('decrements active job count after cancellation', () => {
      const manager = new JobManager({
        lint: { execute: () => new Promise(() => {}) },
        analyze: { execute: () => new Promise(() => {}) },
        generateValidate: { execute: () => new Promise(() => {}) },
      });

      const job = manager.createJob(sampleInput)!;
      expect(manager.getActiveJobCount()).toBe(1);

      manager.cancelJob(job.id);
      expect(manager.getActiveJobCount()).toBe(0);
    });
  });

  describe('getActiveJobCount', () => {
    it('returns 0 when no jobs exist', () => {
      const manager = makeManager();
      expect(manager.getActiveJobCount()).toBe(0);
    });

    it('returns 0 after all jobs complete', async () => {
      const manager = makeManager();
      const job1 = manager.createJob(sampleInput)!;
      const job2 = manager.createJob(sampleInput)!;
      await waitForDone(job1);
      await waitForDone(job2);

      expect(manager.getActiveJobCount()).toBe(0);
    });
  });
});
