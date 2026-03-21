import type { AnalysisInput, AutomatedResults, ComponentAnalysis } from '../../types/analysis.js';
import type { PhaseRunner } from '../phase-runner.js';

export interface AnalyzeInput {
  analysisInput: AnalysisInput;
  lintResult: AutomatedResults;
}

/** Stub analyze runner — resolves with a minimal unknown-pattern result. Real implementation in a later plan. */
export class StubAnalyzeRunner implements PhaseRunner<AnalyzeInput, ComponentAnalysis> {
  async execute(_input: AnalyzeInput): Promise<ComponentAnalysis> {
    return {
      patternType: 'unknown',
      patternConfidence: 0,
      events: [],
      cssFlags: [],
      ariaFindings: [],
    };
  }
}
