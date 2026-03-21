import { setup, assign, fromPromise } from 'xstate';
import type { AnalysisInput, AutomatedResults, ComponentAnalysis } from '../types/analysis.js';
import type { ManualTest } from '../types/ittt.js';
import type { JobError, PipelinePhase } from '../types/job.js';
import type { PhaseRunner } from './phase-runner.js';
import type { LintInput } from './runners/lint-runner.js';
import type { AnalyzeInput } from './runners/analyze-runner.js';
import type { GenerateInput } from './runners/generate-runner.js';
import type { ValidateInput, ValidationOutput } from './runners/validate-runner.js';

export const MAX_ITERATIONS = 2;

export interface PipelineRunners {
  lint: PhaseRunner<LintInput, AutomatedResults>;
  analyze: PhaseRunner<AnalyzeInput, ComponentAnalysis>;
  generate: PhaseRunner<GenerateInput, ManualTest[]>;
  validate: PhaseRunner<ValidateInput, ValidationOutput>;
}

export interface MachineContext {
  input: AnalysisInput;
  lintResult: AutomatedResults | null;
  analysisResult: ComponentAnalysis | null;
  generatedTests: ManualTest[] | null;
  validationResult: ValidationOutput | null;
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
    runGenerate: fromPromise<ManualTest[], GenerateInput>(async () => {
      throw new Error('No runner provided — use createAnalysisMachine()');
    }),
    runValidate: fromPromise<ValidationOutput, ValidateInput>(async () => {
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
          target: 'GENERATE',
          actions: assign({ analysisResult: ({ event }) => event.output }),
        },
        onError: {
          target: 'FAILED',
          actions: assign({ errors: ({ event }) => [toError('ANALYZE', event.error)] }),
        },
      },
    },

    GENERATE: {
      invoke: {
        src: 'runGenerate',
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
          target: 'VALIDATE',
          actions: assign({ generatedTests: ({ event }) => event.output }),
        },
        onError: {
          target: 'FAILED',
          actions: assign({ errors: ({ event }) => [toError('GENERATE', event.error)] }),
        },
      },
    },

    VALIDATE: {
      invoke: {
        src: 'runValidate',
        input: ({ context }) => ({
          generatedTests: context.generatedTests ?? [],
          analysisResult: context.analysisResult ?? {
            patternType: 'unknown' as const,
            patternConfidence: 0,
            events: [],
            cssFlags: [],
            ariaFindings: [],
          },
        }),
        onDone: [
          {
            guard: ({ event }) => event.output.passed,
            target: 'COMPLETE',
            actions: assign({ validationResult: ({ event }) => event.output }),
          },
          {
            guard: ({ context }) => context.iterationCount < MAX_ITERATIONS,
            target: 'ANALYZE',
            actions: assign(({ context, event }) => ({
              validationResult: event.output,
              iterationCount: context.iterationCount + 1,
            })),
          },
          {
            target: 'FAILED',
            actions: assign({
              errors: () => [
                {
                  message: `Validation failed after ${MAX_ITERATIONS} iterations`,
                  phase: 'VALIDATE' as const,
                },
              ],
            }),
          },
        ],
        onError: {
          target: 'FAILED',
          actions: assign({ errors: ({ event }) => [toError('VALIDATE', event.error)] }),
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
      runGenerate: runnerActor(runners.generate, 'GENERATE'),
      runValidate: runnerActor(runners.validate, 'VALIDATE'),
    },
  });
}
