import { v4 as uuidv4 } from 'uuid';
import type {
  Job,
  PipelinePhase,
  JobError,
} from '../types/job.js';
import type { AnalysisInput } from '../types/analysis.js';
import type { AnalysisResult } from '../types/ittt.js';
import { PIPELINE_PHASES } from '../types/job.js';

const MAX_CONCURRENT_JOBS = 10;
const MAX_ITERATIONS = 2;

/**
 * Valid phase transitions. Each phase maps to the set of phases it can transition to.
 */
const VALID_TRANSITIONS: Record<PipelinePhase, PipelinePhase[]> = {
  SUBMIT: ['LINT'],
  LINT: ['ANALYZE'],
  ANALYZE: ['GENERATE'],
  GENERATE: ['VALIDATE'],
  VALIDATE: ['ANALYZE', 'COMPLETE'],
  COMPLETE: [],
};

export class JobManager {
  private jobs = new Map<string, Job>();

  /**
   * Create a new analysis job. Returns the job, or null if at capacity.
   */
  createJob(input: AnalysisInput): Job | null {
    const activeCount = this.getActiveJobCount();
    if (activeCount >= MAX_CONCURRENT_JOBS) {
      return null;
    }

    const id = `job_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const now = new Date().toISOString();

    const job: Job = {
      id,
      status: 'accepted',
      phase: 'SUBMIT',
      phaseIndex: 0,
      totalPhases: PIPELINE_PHASES.length,
      description: 'Job accepted, queued for processing',
      input,
      result: null,
      errors: [],
      startedAt: now,
      updatedAt: now,
      completedAt: null,
      failedAt: null,
      iterationCount: 0,
    };

    this.jobs.set(id, job);
    return job;
  }

  /**
   * Transition a job to the next phase.
   * Throws if the transition is invalid.
   */
  transitionTo(jobId: string, nextPhase: PipelinePhase, description: string): Job {
    const job = this.getJobOrThrow(jobId);

    if (job.status === 'completed' || job.status === 'failed') {
      throw new Error(`Job ${jobId} is already ${job.status}`);
    }

    const allowed = VALID_TRANSITIONS[job.phase];
    if (!allowed.includes(nextPhase)) {
      throw new Error(
        `Invalid transition: ${job.phase} → ${nextPhase}. Allowed: ${allowed.join(', ')}`,
      );
    }

    if (job.phase === 'VALIDATE' && nextPhase === 'ANALYZE') {
      if (job.iterationCount >= MAX_ITERATIONS) {
        throw new Error(
          `Max iteration count (${MAX_ITERATIONS}) reached. Must transition to COMPLETE.`,
        );
      }
      job.iterationCount++;
    }

    const phaseIndex = PIPELINE_PHASES.indexOf(nextPhase);

    job.phase = nextPhase;
    job.phaseIndex = phaseIndex;
    job.status = nextPhase === 'COMPLETE' ? 'completed' : 'in_progress';
    job.description = description;
    job.updatedAt = new Date().toISOString();

    if (nextPhase === 'COMPLETE') {
      job.completedAt = new Date().toISOString();
    }

    return job;
  }

  /**
   * Mark a job as failed with error details.
   */
  failJob(jobId: string, errors: JobError[]): Job {
    const job = this.getJobOrThrow(jobId);
    job.status = 'failed';
    job.errors = errors;
    job.failedAt = new Date().toISOString();
    job.updatedAt = new Date().toISOString();
    job.description = errors[0]?.message ?? 'Job failed';
    return job;
  }

  /**
   * Attach the analysis result to a completed job.
   */
  setResult(jobId: string, result: AnalysisResult): void {
    const job = this.getJobOrThrow(jobId);
    job.result = result;
    job.updatedAt = new Date().toISOString();
  }

  /**
   * Retrieve a job by ID. Throws if not found.
   */
  getJob(jobId: string): Job {
    return this.getJobOrThrow(jobId);
  }

  /**
   * Count of jobs that are accepted or in_progress.
   */
  getActiveJobCount(): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'accepted' || job.status === 'in_progress') {
        count++;
      }
    }
    return count;
  }

  private getJobOrThrow(jobId: string): Job {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job not found: ${jobId}`);
    }
    return job;
  }
}

/** Singleton instance */
export const jobManager = new JobManager();
