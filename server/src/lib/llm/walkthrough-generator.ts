import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { AnalysisResult } from '../../types/ittt.js';
import { createModel, getModelName } from './config.js';
import { extractJson } from './utils.js';
import { getTracingCallbacks, flushTracing } from './tracing.js';
import {
  GENERATION_SYSTEM_PROMPT,
  GENERATION_USER_PROMPT,
  OUTPUT_SCHEMA,
} from './prompts/generation.js';
import {
  getCriteriaByIds,
  getManualTestingRef,
  loadAssistiveTechGuides,
} from '../wcag/knowledge-base.js';

const MAX_RETRIES = 2;

export interface GenerationOptions {
  /** Current iteration in the GENERATE↔VALIDATE loop (0 = first pass). */
  iteration?: number;
  /** Feedback from the previous validation pass, appended to the prompt. */
  validationFeedback?: string;
}

export async function generateWalkthrough(
  analysisResults: string,
  componentType: string,
  description: string,
  options?: GenerationOptions,
): Promise<AnalysisResult> {
  const model = createModel('generation');
  const iteration = options?.iteration ?? 0;
  const validationFeedback = options?.validationFeedback;

  // Build context from knowledge base
  const wcagCriteria = getCriteriaByIds(['1.1.1', '2.1.1', '2.4.7', '4.1.2']);
  const wcagContext = wcagCriteria
    .map((c) => `${c.id} ${c.title} (Level ${c.level}): ${c.description}`)
    .join('\n');
  const atGuides = loadAssistiveTechGuides();
  const atGuidesText = atGuides.map((g) => `${g.tool} (${g.platform}): ${g.label}`).join('\n');
  const manualTestingRef = getManualTestingRef();

  let userPrompt = GENERATION_USER_PROMPT.replace('{componentType}', componentType)
    .replace('{description}', description)
    .replace('{analysisResults}', analysisResults)
    .replace('{wcagContext}', wcagContext)
    .replace('{atGuides}', atGuidesText)
    .replace('{manualTestingRef}', manualTestingRef)
    .replace('{outputSchema}', JSON.stringify(OUTPUT_SCHEMA, null, 2));

  if (validationFeedback) {
    userPrompt += `\n\n--- Validation Feedback (iteration ${iteration}) ---\nThe previous walkthrough was reviewed and did not meet the confidence threshold. Address the following issues in your revised output:\n${validationFeedback}`;
  }

  const tracingConfig = getTracingCallbacks({
    runName: `walkthrough-generation${iteration > 0 ? ` [iteration ${iteration}]` : ''}`,
    tags: ['generation', componentType, ...(iteration > 0 ? [`iteration-${iteration}`] : [])],
    metadata: { componentType, attempt: 0, iteration },
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (tracingConfig?.metadata) {
      tracingConfig.metadata.attempt = attempt;
    }
    try {
      const response = await model.invoke(
        [new SystemMessage(GENERATION_SYSTEM_PROMPT), new HumanMessage(userPrompt)],
        tracingConfig,
      );

      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      const parsed = extractJson(content) as AnalysisResult;
      validateStructure(parsed);

      // Attach automated results placeholder if not present
      if (!parsed.automatedResults) {
        parsed.automatedResults = {
          axeViolations: [],
          eslintMessages: [],
          customRuleFlags: [],
        };
      }

      await flushTracing();
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) continue;
    }
  }

  await flushTracing();
  throw new Error(
    `Walkthrough generation failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}`,
  );
}

function validateStructure(data: unknown): asserts data is AnalysisResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Response is not an object');
  }

  const obj = data as Record<string, unknown>;

  if (!obj.component || typeof obj.component !== 'object') {
    throw new Error('Missing or invalid "component" field');
  }

  if (!Array.isArray(obj.manualTests)) {
    throw new Error('Missing or invalid "manualTests" array');
  }

  if (typeof obj.summary !== 'string') {
    throw new Error('Missing or invalid "summary" string');
  }

  if (typeof obj.allClear !== 'boolean') {
    throw new Error('Missing or invalid "allClear" boolean');
  }
}

export function getGenerationModelName(): string {
  return getModelName('generation');
}
