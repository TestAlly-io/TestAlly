import type { AnalysisInput, ComponentAnalysis } from '../../types/analysis.js';
import type { ManualTest } from '../../types/ittt.js';
import type { PhaseRunner } from '../phase-runner.js';
import { generateWalkthrough } from '../llm/walkthrough-generator.js';

export interface GenerateInput {
  analysisInput: AnalysisInput;
  analysisResult: ComponentAnalysis;
  validationFeedback?: string;
  iteration?: number;
}

/** Stub generate runner — resolves with an empty test list. Used in tests. */
export class StubGenerateRunner implements PhaseRunner<GenerateInput, ManualTest[]> {
  async execute(_input: GenerateInput): Promise<ManualTest[]> {
    return [];
  }
}

/** Real generate runner — calls the LLM walkthrough generator with tracing. */
export class LlmGenerateRunner implements PhaseRunner<GenerateInput, ManualTest[]> {
  async execute(input: GenerateInput): Promise<ManualTest[]> {
    const analysisResults = JSON.stringify(input.analysisResult);
    const componentType = input.analysisResult.patternType;
    const description = input.analysisInput.description ?? componentType;

    const result = await generateWalkthrough(analysisResults, componentType, description, {
      iteration: input.iteration,
      validationFeedback: input.validationFeedback,
    });

    return result.manualTests;
  }
}
