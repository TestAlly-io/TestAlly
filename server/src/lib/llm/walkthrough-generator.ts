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

export async function generateWalkthrough(
  analysisResults: string,
  componentType: string,
  description: string,
): Promise<AnalysisResult> {
  const model = createModel('generation');

  // Build context from knowledge base
  const wcagCriteria = getCriteriaByIds(['1.1.1', '2.1.1', '2.4.7', '4.1.2']);
  const wcagContext = wcagCriteria
    .map((c) => `${c.id} ${c.title} (Level ${c.level}): ${c.description}`)
    .join('\n');
  const atGuides = loadAssistiveTechGuides();
  const atGuidesText = atGuides.map((g) => `${g.tool} (${g.platform}): ${g.label}`).join('\n');
  const manualTestingRef = getManualTestingRef();

  const userPrompt = GENERATION_USER_PROMPT.replace('{componentType}', componentType)
    .replace('{description}', description)
    .replace('{analysisResults}', analysisResults)
    .replace('{wcagContext}', wcagContext)
    .replace('{atGuides}', atGuidesText)
    .replace('{manualTestingRef}', manualTestingRef)
    .replace('{outputSchema}', JSON.stringify(OUTPUT_SCHEMA, null, 2));

  const tracingConfig = getTracingCallbacks({
    runName: 'walkthrough-generation',
    tags: ['generation', componentType],
    metadata: { componentType, attempt: 0 },
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
