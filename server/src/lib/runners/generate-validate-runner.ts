import type { AnalysisInput, ComponentAnalysis } from '../../types/analysis.js';
import type { ManualTest } from '../../types/ittt.js';
import type { PhaseRunner } from '../phase-runner.js';
import {
  runAuthoringAgent,
  type GenerateValidateOutput,
} from '../llm/authoring-agent.js';

export interface GenerateValidateInput {
  analysisInput: AnalysisInput;
  analysisResult: ComponentAnalysis;
}

export { type GenerateValidateOutput };

/** Stub runner — resolves instantly with empty results. Used in tests. */
export class StubGenerateValidateRunner
  implements PhaseRunner<GenerateValidateInput, GenerateValidateOutput>
{
  async execute(_input: GenerateValidateInput): Promise<GenerateValidateOutput> {
    return {
      generatedTests: [],
      summary: '',
      validation: { confidence: 100, passed: true },
      iterationCount: 0,
    };
  }
}

/** Real runner — delegates to the authoring agent. */
export class AgentGenerateValidateRunner
  implements PhaseRunner<GenerateValidateInput, GenerateValidateOutput>
{
  async execute(input: GenerateValidateInput): Promise<GenerateValidateOutput> {
    return runAuthoringAgent(input);
  }
}
