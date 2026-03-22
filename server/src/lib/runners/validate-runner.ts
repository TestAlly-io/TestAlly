import type { ComponentAnalysis } from '../../types/analysis.js';
import type { ManualTest } from '../../types/ittt.js';
import type { PhaseRunner } from '../phase-runner.js';
import { validateWalkthrough } from '../llm/walkthrough-validator.js';

export interface ValidateInput {
  generatedTests: ManualTest[];
  analysisResult: ComponentAnalysis;
  iteration?: number;
}

export interface ValidationOutput {
  confidence: number;
  passed: boolean;
  feedback?: string;
}

/** Stub validate runner — always passes with full confidence. Used in tests. */
export class StubValidateRunner implements PhaseRunner<ValidateInput, ValidationOutput> {
  async execute(_input: ValidateInput): Promise<ValidationOutput> {
    return { confidence: 1.0, passed: true };
  }
}

/** Real validate runner — calls the LLM walkthrough validator with tracing. */
export class LlmValidateRunner implements PhaseRunner<ValidateInput, ValidationOutput> {
  async execute(input: ValidateInput): Promise<ValidationOutput> {
    const walkthrough = {
      component: {
        type: input.analysisResult.patternType,
        description: '',
        confidence: input.analysisResult.patternConfidence,
      },
      automatedResults: { axeViolations: [], eslintMessages: [], customRuleFlags: [] },
      manualTests: input.generatedTests,
      allClear: input.generatedTests.length === 0,
      summary: '',
    };

    const analysisResults = JSON.stringify(input.analysisResult);
    const componentType = input.analysisResult.patternType;

    const result = await validateWalkthrough(walkthrough, analysisResults, componentType, {
      iteration: input.iteration,
    });

    return {
      confidence: result.confidence,
      passed: result.confidence >= 95,
      feedback: result.feedback ?? result.issues.map((i) => `[${i.severity}] ${i.message}`).join('\n'),
    };
  }
}
