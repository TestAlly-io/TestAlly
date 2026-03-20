import { describe, it, expect, beforeEach } from 'vitest';
import { JobManager } from '../job-manager.js';
import type { AnalysisInput } from '../../types/analysis.js';

const sampleInput: AnalysisInput = {
  code: '<div class="accordion">test</div>',
  language: 'html',
  description: 'Accordion component',
};

describe('JobManager', () => {
  let manager: JobManager;

  beforeEach(() => {
    manager = new JobManager();
  });

  describe('createJob', () => {
    it('creates a job with initial state', () => {
      const job = manager.createJob(sampleInput);
      expect(job).not.toBeNull();
      expect(job!.status).toBe('accepted');
      expect(job!.phase).toBe('SUBMIT');
      expect(job!.id).toMatch(/^job_/);
    });

    it('returns null when at capacity', () => {
      for (let i = 0; i < 10; i++) {
        manager.createJob(sampleInput);
      }
      const overflow = manager.createJob(sampleInput);
      expect(overflow).toBeNull();
    });
  });

  describe('transitionTo', () => {
    it('follows the happy path through all phases', () => {
      const job = manager.createJob(sampleInput)!;

      manager.transitionTo(job.id, 'LINT', 'Linting...');
      expect(manager.getJob(job.id)!.phase).toBe('LINT');
      expect(manager.getJob(job.id)!.status).toBe('in_progress');

      manager.transitionTo(job.id, 'ANALYZE', 'Analyzing...');
      manager.transitionTo(job.id, 'GENERATE', 'Generating...');
      manager.transitionTo(job.id, 'VALIDATE', 'Validating...');
      manager.transitionTo(job.id, 'COMPLETE', 'Done');

      const final = manager.getJob(job.id)!;
      expect(final.phase).toBe('COMPLETE');
      expect(final.status).toBe('completed');
      expect(final.completedAt).not.toBeNull();
    });

    it('rejects invalid transitions', () => {
      const job = manager.createJob(sampleInput)!;
      expect(() => manager.transitionTo(job.id, 'ANALYZE', 'skip')).toThrow(
        'Invalid transition',
      );
    });

    it('allows VALIDATE → ANALYZE loop up to 2 times', () => {
      const job = manager.createJob(sampleInput)!;
      manager.transitionTo(job.id, 'LINT', '');
      manager.transitionTo(job.id, 'ANALYZE', '');
      manager.transitionTo(job.id, 'GENERATE', '');
      manager.transitionTo(job.id, 'VALIDATE', '');

      // First loop
      manager.transitionTo(job.id, 'ANALYZE', 'loop 1');
      expect(manager.getJob(job.id)!.iterationCount).toBe(1);

      manager.transitionTo(job.id, 'GENERATE', '');
      manager.transitionTo(job.id, 'VALIDATE', '');

      // Second loop
      manager.transitionTo(job.id, 'ANALYZE', 'loop 2');
      expect(manager.getJob(job.id)!.iterationCount).toBe(2);

      manager.transitionTo(job.id, 'GENERATE', '');
      manager.transitionTo(job.id, 'VALIDATE', '');

      // Third loop should fail
      expect(() => manager.transitionTo(job.id, 'ANALYZE', 'loop 3')).toThrow(
        'Max iteration count',
      );
    });
  });

  describe('failJob', () => {
    it('marks a job as failed', () => {
      const job = manager.createJob(sampleInput)!;
      manager.transitionTo(job.id, 'LINT', 'Linting...');
      manager.failJob(job.id, [{ message: 'LLM unavailable', phase: 'LINT' }]);

      const failed = manager.getJob(job.id)!;
      expect(failed.status).toBe('failed');
      expect(failed.failedAt).not.toBeNull();
      expect(failed.errors).toHaveLength(1);
    });
  });

  describe('getJob', () => {
    it('returns undefined for unknown ID', () => {
      expect(manager.getJob('nonexistent')).toBeUndefined();
    });
  });
});
