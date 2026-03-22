import type { AnalysisInput, AutomatedResults } from '../../types/analysis.js';
import type { PhaseRunner } from '../phase-runner.js';
import { runAxeAnalysis } from '../analysis/axe-runner.js';
import { runEslintAnalysis } from '../analysis/eslint-runner.js';
import { runCustomRules } from '../analysis/custom-rules/index.js';

export interface LintInput {
  analysisInput: AnalysisInput;
}

/** Runs axe-core, ESLint jsx-a11y, and custom rules against the submitted code. */
export class LintRunner implements PhaseRunner<LintInput, AutomatedResults> {
  async execute(input: LintInput): Promise<AutomatedResults> {
    const { code, language, css, js } = input.analysisInput;

    const [axeResult, eslintMessages] = await Promise.all([
      runAxeAnalysis(code),
      runEslintAnalysis(code, language),
    ]);
    const customRuleFlags = runCustomRules(code, css, js);

    return {
      axeViolations: axeResult.violations,
      eslintMessages,
      customRuleFlags,
    };
  }
}

/** Stub lint runner — resolves with empty results. Used in tests. */
export class StubLintRunner implements PhaseRunner<LintInput, AutomatedResults> {
  async execute(_input: LintInput): Promise<AutomatedResults> {
    return {
      axeViolations: [],
      eslintMessages: [],
      customRuleFlags: [],
    };
  }
}
