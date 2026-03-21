import type { ComponentAnalysis } from '../../types/analysis.js';
import type { ManualTest } from '../../types/ittt.js';
import type { PhaseRunner } from '../phase-runner.js';

export interface ValidateInput {
  generatedTests: ManualTest[];
  analysisResult: ComponentAnalysis;
}

export interface ValidationOutput {
  confidence: number;
  passed: boolean;
}

/** Stub validate runner — always passes with full confidence. Real implementation in a later plan. */
export class StubValidateRunner implements PhaseRunner<ValidateInput, ValidationOutput> {
  async execute(_input: ValidateInput): Promise<ValidationOutput> {
    return { confidence: 1.0, passed: true };
  }
}
