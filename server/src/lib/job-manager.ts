import { v4 as uuidv4 } from 'uuid';
import { createActor, type AnyActorRef } from 'xstate';
import type { AnalysisInput } from '../types/analysis.js';
import type { AnalysisResult } from '../types/ittt.js';
import { PIPELINE_PHASES, type Job, type PipelinePhase } from '../types/job.js';
import { createAnalysisMachine, type MachineContext, type PipelineRunners } from './analysis-machine.js';
import { LintRunner } from './runners/lint-runner.js';
import { AnalyzeRunner } from './runners/analyze-runner.js';
import { StubGenerateRunner } from './runners/generate-runner.js';
import { StubValidateRunner } from './runners/validate-runner.js';

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
    allClear:
      ctx.lintResult !== null &&
      (ctx.generatedTests?.length ?? 0) === 0 &&
      ctx.lintResult.axeViolations.length === 0 &&
      ctx.lintResult.eslintMessages.length === 0 &&
      ctx.lintResult.customRuleFlags.length === 0,
    summary: '',
  };
}

function defaultRunners(): PipelineRunners {
  return {
    lint: new LintRunner(),
    analyze: new AnalyzeRunner(),
    generate: new StubGenerateRunner(),
    validate: new StubValidateRunner(),
  };
}

export class JobManager {
  private readonly jobs = new Map<string, Job>();
  private readonly actors = new Map<string, AnyActorRef>();
  private readonly machine: ReturnType<typeof createAnalysisMachine>;

  constructor(runners?: PipelineRunners) {
    this.machine = createAnalysisMachine(runners ?? defaultRunners());
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
    this.actors.set(id, actor);

    actor.subscribe((snapshot) => {
      const stateValue = snapshot.value as string;
      const ctx = snapshot.context;
      const ts = now();

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
        this.actors.delete(id);
      } else if (stateValue === 'FAILED') {
        job.status = 'failed';
        job.failedAt = ts;
        job.errors = ctx.errors;
        this.actors.delete(id);
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

  /**
   * Cancel a running job. Stops its actor and marks it as failed.
   * Returns true if the job was cancelled, false if not found or already terminal.
   */
  cancelJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (!job || job.status === 'completed' || job.status === 'failed') {
      return false;
    }

    const actor = this.actors.get(jobId);
    if (actor) {
      actor.stop();
      this.actors.delete(jobId);
    }

    const ts = now();
    job.status = 'failed';
    job.failedAt = ts;
    job.updatedAt = ts;
    job.errors = [{ message: 'Job cancelled', phase: job.phase }];

    return true;
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
