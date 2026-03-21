import type { AnalysisInput, AutomatedResults } from '../../types/analysis.js';
import type { PhaseRunner } from '../phase-runner.js';

export interface LintInput {
  analysisInput: AnalysisInput;
}

/** Stub lint runner — resolves with empty results. Real implementation in a later plan. */
export class StubLintRunner implements PhaseRunner<LintInput, AutomatedResults> {
  async execute(_input: LintInput): Promise<AutomatedResults> {
    return {
      axeViolations: [],
      eslintMessages: [],
      customRuleFlags: [],
    };
  }
}
