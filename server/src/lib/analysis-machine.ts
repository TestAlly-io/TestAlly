import { setup, assign, fromPromise } from 'xstate';
import type { AnalysisInput, AutomatedResults, ComponentAnalysis } from '../types/analysis.js';
import type { ManualTest } from '../types/ittt.js';
import type { JobError, PipelinePhase } from '../types/job.js';
import type { PhaseRunner } from './phase-runner.js';
import type { LintInput } from './runners/lint-runner.js';
import type { AnalyzeInput } from './runners/analyze-runner.js';
import type { GenerateInput } from './runners/generate-runner.js';
import type { ValidateInput, ValidationOutput } from './runners/validate-runner.js';
import { StubLintRunner } from './runners/lint-runner.js';
import { StubAnalyzeRunner } from './runners/analyze-runner.js';
import { StubGenerateRunner } from './runners/generate-runner.js';
import { StubValidateRunner } from './runners/validate-runner.js';

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

/**
 * Base analysis pipeline machine. Uses stub runners by default.
 * Call `.provide({ actors: { ... } })` to inject real runners.
 */
export const analysisMachine = setup({
  types: {
    context: {} as MachineContext,
    input: {} as { analysisInput: AnalysisInput },
  },
  actors: {
    runLint: fromPromise<AutomatedResults, LintInput>(async ({ input }) => {
      const runner: PhaseRunner<LintInput, AutomatedResults> = new StubLintRunner();
      if (runner.gate && !runner.gate()) {
        throw new Error('Gate condition failed for LINT');
      }
      return runner.execute(input);
    }),
    runAnalyze: fromPromise<ComponentAnalysis, AnalyzeInput>(async ({ input }) => {
      const runner: PhaseRunner<AnalyzeInput, ComponentAnalysis> = new StubAnalyzeRunner();
      if (runner.gate && !runner.gate()) {
        throw new Error('Gate condition failed for ANALYZE');
      }
      return runner.execute(input);
    }),
    runGenerate: fromPromise<ManualTest[], GenerateInput>(async ({ input }) => {
      const runner: PhaseRunner<GenerateInput, ManualTest[]> = new StubGenerateRunner();
      if (runner.gate && !runner.gate()) {
        throw new Error('Gate condition failed for GENERATE');
      }
      return runner.execute(input);
    }),
    runValidate: fromPromise<ValidationOutput, ValidateInput>(async ({ input }) => {
      const runner: PhaseRunner<ValidateInput, ValidationOutput> = new StubValidateRunner();
      if (runner.gate && !runner.gate()) {
        throw new Error('Gate condition failed for VALIDATE');
      }
      return runner.execute(input);
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
            // Validation passed — complete the job
            guard: ({ event }) => event.output.passed,
            target: 'COMPLETE',
            actions: assign({ validationResult: ({ event }) => event.output }),
          },
          {
            // Validation failed but iterations remain — loop back to ANALYZE
            guard: ({ context }) => context.iterationCount < MAX_ITERATIONS,
            target: 'ANALYZE',
            actions: assign(({ context, event }) => ({
              validationResult: event.output,
              iterationCount: context.iterationCount + 1,
            })),
          },
          {
            // Max iterations exceeded — fail the job
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
    // Insert them here when the execution driver is built.

    COMPLETE: { type: 'final' },
    FAILED: { type: 'final' },
  },
});

/**
 * Create an analysis machine with injected phase runners.
 * Use this in production and in tests that need custom runner behaviour.
 */
export function createAnalysisMachine(runners: PipelineRunners) {
  return analysisMachine.provide({
    actors: {
      runLint: fromPromise<AutomatedResults, LintInput>(async ({ input }) => {
        if (runners.lint.gate && !runners.lint.gate()) {
          throw new Error('Gate condition failed for LINT');
        }
        return runners.lint.execute(input);
      }),
      runAnalyze: fromPromise<ComponentAnalysis, AnalyzeInput>(async ({ input }) => {
        if (runners.analyze.gate && !runners.analyze.gate()) {
          throw new Error('Gate condition failed for ANALYZE');
        }
        return runners.analyze.execute(input);
      }),
      runGenerate: fromPromise<ManualTest[], GenerateInput>(async ({ input }) => {
        if (runners.generate.gate && !runners.generate.gate()) {
          throw new Error('Gate condition failed for GENERATE');
        }
        return runners.generate.execute(input);
      }),
      runValidate: fromPromise<ValidationOutput, ValidateInput>(async ({ input }) => {
        if (runners.validate.gate && !runners.validate.gate()) {
          throw new Error('Gate condition failed for VALIDATE');
        }
        return runners.validate.execute(input);
      }),
    },
  });
}
