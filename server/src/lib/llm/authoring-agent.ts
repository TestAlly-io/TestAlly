import { createAgent } from 'langchain';
import type { AnalysisInput, ComponentAnalysis } from '../../types/analysis.js';
import type { ManualTest, WalkthroughResources } from '../../types/ittt.js';
import { createModel } from './config.js';
import { createAuthoringTools, type AuthoringToolsContext } from './authoring-tools.js';
import { getTracingCallbacks, flushTracing } from './tracing.js';
import { getConfidenceThreshold, MAX_ITERATIONS } from '../analysis-machine.js';
import {
  AUTHORING_SYSTEM_PROMPT,
  AUTHORING_USER_PROMPT,
} from './prompts/authoring.js';

export interface GenerateValidateInput {
  analysisInput: AnalysisInput;
  analysisResult: ComponentAnalysis;
}

export interface GenerateValidateOutput {
  generatedTests: ManualTest[];
  summary: string;
  resources?: WalkthroughResources;
  validation: {
    confidence: number;
    passed: boolean;
    feedback?: string;
  };
  iterationCount: number;
}

export async function runAuthoringAgent(
  input: GenerateValidateInput,
): Promise<GenerateValidateOutput> {
  const model = createModel('authoring');
  const confidenceThreshold = getConfidenceThreshold();

  const toolsContext: AuthoringToolsContext = {
    analysisInput: input.analysisInput,
    analysisResult: input.analysisResult,
    currentWalkthrough: null,
    currentValidation: null,
    iterationCount: 0,
    maxIterations: MAX_ITERATIONS,
    confidenceThreshold,
  };

  const tools = createAuthoringTools(toolsContext);

  const systemPrompt = AUTHORING_SYSTEM_PROMPT
    .replace(/\{confidenceThreshold\}/g, String(confidenceThreshold))
    .replace(/\{maxIterations\}/g, String(MAX_ITERATIONS));

  const userMessage = AUTHORING_USER_PROMPT
    .replace('{componentType}', input.analysisResult.patternType)
    .replace('{description}', input.analysisInput.description ?? input.analysisResult.patternType)
    .replace('{analysisResults}', JSON.stringify(input.analysisResult))
    .replace('{confidenceThreshold}', String(confidenceThreshold))
    .replace('{maxIterations}', String(MAX_ITERATIONS));

  const agent = createAgent({
    model,
    tools,
    systemPrompt,
  });

  const tracingConfig = getTracingCallbacks({
    runName: 'authoring-agent',
    tags: ['authoring', input.analysisResult.patternType],
    metadata: {
      componentType: input.analysisResult.patternType,
      confidenceThreshold,
      maxIterations: MAX_ITERATIONS,
    },
  });

  // Each tool call uses ~2 recursion steps (agent→tool). With a max of 8 tool calls
  // plus the final agent response, 25 is enough but we set 30 for safety.
  const invokeConfig = {
    ...tracingConfig,
    recursionLimit: 30,
  };

  try {
    await agent.invoke(
      { messages: [{ role: 'user', content: userMessage }] },
      invokeConfig,
    );
  } catch (err) {
    // If the agent fails but we have partial results, return them
    if (toolsContext.currentWalkthrough) {
      console.warn('Authoring agent errored but partial results available:', err);
    } else {
      throw err;
    }
  }

  await flushTracing();

  // Build output from the mutable tools context
  const confidence = toolsContext.currentValidation?.confidence ?? 0;

  if (!toolsContext.currentWalkthrough) {
    throw new Error('Authoring agent completed without generating a walkthrough.');
  }

  return {
    generatedTests: toolsContext.currentWalkthrough.manualTests,
    summary: toolsContext.currentWalkthrough.summary ?? '',
    resources: toolsContext.currentWalkthrough.resources,
    validation: {
      confidence,
      passed: confidence >= confidenceThreshold,
      feedback: toolsContext.currentValidation?.feedback
        ?? toolsContext.currentValidation?.issues
          .map((i) => `[${i.severity}] ${i.message}`)
          .join('\n'),
    },
    iterationCount: toolsContext.iterationCount,
  };
}
