import { v4 as uuidv4 } from 'uuid';
import { createActor } from 'xstate';
import type { AnalysisInput } from '../types/analysis.js';
import type { AnalysisResult } from '../types/ittt.js';
import { PIPELINE_PHASES, type Job, type PipelinePhase } from '../types/job.js';
import { analysisMachine, createAnalysisMachine, type MachineContext, type PipelineRunners } from './analysis-machine.js';

const MAX_CONCURRENT_JOBS = 10;

function now(): string {
  return new Date().toISOString();
}

function phaseDescription(phase: string): string {
  const descriptions: Record<string, string> = {
    SUBMIT: 'Job accepted, queued for processing',
    LINT: 'Running static analysis',
    ANALYZE: 'Analyzing component patterns',
    GENERATE: 'Generating manual test walkthroughs',
    VALIDATE: 'Validating output accuracy',
    COMPLETE: 'Analysis complete',
    FAILED: 'Job failed',
  };
  return descriptions[phase] ?? phase;
}

function buildResult(ctx: MachineContext): AnalysisResult {
  return {
    component: {
      type: ctx.analysisResult?.patternType ?? 'unknown',
      description: ctx.input.description ?? '',
      confidence: ctx.analysisResult?.patternConfidence ?? 0,
    },
    automatedResults: ctx.lintResult ?? {
      axeViolations: [],
      eslintMessages: [],
      customRuleFlags: [],
    },
    manualTests: ctx.generatedTests ?? [],
    allClear: (ctx.generatedTests?.length ?? 0) === 0,
    summary: '',
  };
}

export class JobManager {
  private readonly jobs = new Map<string, Job>();
  private readonly machine: typeof analysisMachine;

  constructor(runners?: PipelineRunners) {
    this.machine = runners ? createAnalysisMachine(runners) : analysisMachine;
  }

  /**
   * Create and immediately start a new analysis job.
   * Returns the job record, or null if at capacity.
   */
  createJob(input: AnalysisInput): Job | null {
    if (this.getActiveJobCount() >= MAX_CONCURRENT_JOBS) {
      return null;
    }

    const id = `job_${uuidv4().replace(/-/g, '').slice(0, 12)}`;
    const startedAt = now();

    const job: Job = {
      id,
      status: 'accepted',
      phase: 'SUBMIT',
      phaseIndex: 0,
      totalPhases: PIPELINE_PHASES.length,
      description: phaseDescription('SUBMIT'),
      input,
      result: null,
      errors: [],
      startedAt,
      updatedAt: startedAt,
      completedAt: null,
      failedAt: null,
      iterationCount: 0,
    };

    this.jobs.set(id, job);

    const actor = createActor(this.machine, { input: { analysisInput: input } });

    actor.subscribe((snapshot) => {
      const stateValue = snapshot.value as string;
      const ctx = snapshot.context;
      const ts = now();

      // Only update phase/phaseIndex for valid pipeline phases
      if ((PIPELINE_PHASES as readonly string[]).includes(stateValue)) {
        job.phase = stateValue as PipelinePhase;
        job.phaseIndex = PIPELINE_PHASES.indexOf(stateValue as PipelinePhase);
        job.iterationCount = ctx.iterationCount;
      }

      job.description = phaseDescription(stateValue);
      job.updatedAt = ts;

      if (stateValue === 'COMPLETE') {
        job.status = 'completed';
        job.completedAt = ts;
        job.result = buildResult(ctx);
      } else if (stateValue === 'FAILED') {
        job.status = 'failed';
        job.failedAt = ts;
        job.errors = ctx.errors;
      } else if (stateValue === 'SUBMIT') {
        job.status = 'accepted';
      } else {
        job.status = 'in_progress';
      }
    });

    actor.start();
    return job;
  }

  /** Retrieve a job by ID. Returns undefined if not found. */
  getJob(jobId: string): Job | undefined {
    return this.jobs.get(jobId);
  }

  /** Count of jobs that are accepted or in_progress. */
  getActiveJobCount(): number {
    let count = 0;
    for (const job of this.jobs.values()) {
      if (job.status === 'accepted' || job.status === 'in_progress') {
        count++;
      }
    }
    return count;
  }
}

/** Singleton instance using default stub runners. */
export const jobManager = new JobManager();
