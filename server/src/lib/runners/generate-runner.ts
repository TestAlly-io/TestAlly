import type { AnalysisInput, ComponentAnalysis } from '../../types/analysis.js';
import type { ManualTest } from '../../types/ittt.js';
import type { PhaseRunner } from '../phase-runner.js';

export interface GenerateInput {
  analysisInput: AnalysisInput;
  analysisResult: ComponentAnalysis;
}

/** Stub generate runner — resolves with an empty test list. Real implementation in a later plan. */
export class StubGenerateRunner implements PhaseRunner<GenerateInput, ManualTest[]> {
  async execute(_input: GenerateInput): Promise<ManualTest[]> {
    return [];
  }
}
