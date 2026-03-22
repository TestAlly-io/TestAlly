import { setup, assign, fromPromise } from 'xstate';
import type { AnalysisInput, AutomatedResults, ComponentAnalysis } from '../types/analysis.js';
import type { ManualTest } from '../types/ittt.js';
import type { JobError, PipelinePhase } from '../types/job.js';
import type { PhaseRunner } from './phase-runner.js';
import type { LintInput } from './runners/lint-runner.js';
import type { AnalyzeInput } from './runners/analyze-runner.js';
import type {
  GenerateValidateInput,
  GenerateValidateOutput,
} from './runners/generate-validate-runner.js';

export const MAX_ITERATIONS = 5;

export const DEFAULT_CONFIDENCE_THRESHOLD = 95;

export function getConfidenceThreshold(): number {
  const raw = process.env.WALKTHROUGH_CONFIDENCE_THRESHOLD;
  if (raw === undefined) return DEFAULT_CONFIDENCE_THRESHOLD;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 100
    ? parsed
    : DEFAULT_CONFIDENCE_THRESHOLD;
}

export interface PipelineRunners {
  lint: PhaseRunner<LintInput, AutomatedResults>;
  analyze: PhaseRunner<AnalyzeInput, ComponentAnalysis>;
  generateValidate: PhaseRunner<GenerateValidateInput, GenerateValidateOutput>;
}

export interface MachineContext {
  input: AnalysisInput;
  lintResult: AutomatedResults | null;
  analysisResult: ComponentAnalysis | null;
  generatedTests: ManualTest[] | null;
  validationResult: GenerateValidateOutput['validation'] | null;
  iterationCount: number;
  errors: JobError[];
}

function toError(phase: PipelinePhase, err: unknown): JobError {
  return {
    message: err instanceof Error ? err.message : String(err),
    phase,
  };
}

/** Helper: wrap a PhaseRunner into an xstate fromPromise actor, checking the gate first. */
function runnerActor<TIn, TOut>(
  runner: PhaseRunner<TIn, TOut>,
  phase: string,
): ReturnType<typeof fromPromise<TOut, TIn>> {
  return fromPromise<TOut, TIn>(async ({ input }) => {
    if (runner.gate && !runner.gate()) {
      throw new Error(`Gate condition failed for ${phase}`);
    }
    return runner.execute(input);
  });
}

/**
 * Base analysis pipeline machine definition.
 * Actor slots are typed but use unreachable placeholders — always call
 * `createAnalysisMachine(runners)` to get a usable instance.
 */
const analysisMachine = setup({
  types: {
    context: {} as MachineContext,
    input: {} as { analysisInput: AnalysisInput },
  },
  actors: {
    runLint: fromPromise<AutomatedResults, LintInput>(async () => {
      throw new Error('No runner provided — use createAnalysisMachine()');
    }),
    runAnalyze: fromPromise<ComponentAnalysis, AnalyzeInput>(async () => {
      throw new Error('No runner provided — use createAnalysisMachine()');
    }),
    runGenerateValidate: fromPromise<GenerateValidateOutput, GenerateValidateInput>(async () => {
      throw new Error('No runner provided — use createAnalysisMachine()');
    }),
  },
}).createMachine({
  context: ({ input }) => ({
    input: input.analysisInput,
    lintResult: null,
    analysisResult: null,
    generatedTests: null,
    validationResult: null,
    iterationCount: 0,
    errors: [],
  }),
  initial: 'SUBMIT',
  states: {
    // Immediately advances to LINT — allows callers to observe the accepted state
    // before pipeline execution begins.
    SUBMIT: {
      always: { target: 'LINT' },
    },

    LINT: {
      invoke: {
        src: 'runLint',
        input: ({ context }) => ({ analysisInput: context.input }),
        onDone: {
          target: 'ANALYZE',
          actions: assign({ lintResult: ({ event }) => event.output }),
        },
        onError: {
          target: 'FAILED',
          actions: assign({ errors: ({ event }) => [toError('LINT', event.error)] }),
        },
      },
    },

    ANALYZE: {
      invoke: {
        src: 'runAnalyze',
        input: ({ context }) => ({
          analysisInput: context.input,
          lintResult: context.lintResult ?? { axeViolations: [], eslintMessages: [], customRuleFlags: [] },
        }),
        onDone: {
          target: 'GENERATE_VALIDATE',
          actions: assign({ analysisResult: ({ event }) => event.output }),
        },
        onError: {
          target: 'FAILED',
          actions: assign({ errors: ({ event }) => [toError('ANALYZE', event.error)] }),
        },
      },
    },

    GENERATE_VALIDATE: {
      invoke: {
        src: 'runGenerateValidate',
        input: ({ context }) => ({
          analysisInput: context.input,
          analysisResult: context.analysisResult ?? {
            patternType: 'unknown' as const,
            patternConfidence: 0,
            events: [],
            cssFlags: [],
            ariaFindings: [],
          },
        }),
        onDone: {
          target: 'COMPLETE',
          actions: assign(({ event }) => ({
            generatedTests: event.output.generatedTests,
            validationResult: event.output.validation,
            iterationCount: event.output.iterationCount,
          })),
        },
        onError: {
          target: 'FAILED',
          actions: assign({ errors: ({ event }) => [toError('GENERATE_VALIDATE', event.error)] }),
        },
      },
    },

    // BUILD and RENDER are post-MVP — reserved slots between LINT and ANALYZE.

    COMPLETE: { type: 'final' },
    FAILED: { type: 'final' },
  },
});

/**
 * Create an analysis machine with injected phase runners.
 * This is the only way to get a usable machine instance.
 */
export function createAnalysisMachine(runners: PipelineRunners) {
  return analysisMachine.provide({
    actors: {
      runLint: runnerActor(runners.lint, 'LINT'),
      runAnalyze: runnerActor(runners.analyze, 'ANALYZE'),
      runGenerateValidate: runnerActor(runners.generateValidate, 'GENERATE_VALIDATE'),
    },
  });
}
