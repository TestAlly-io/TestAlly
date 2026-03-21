import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { AnalysisResult } from '../../types/ittt.js';
import { createModel, getModelName } from './config.js';
import { extractJson } from './utils.js';
import { getTracingCallbacks, flushTracing } from './tracing.js';
import {
  VALIDATION_SYSTEM_PROMPT,
  VALIDATION_USER_PROMPT,
  VALIDATION_SCHEMA,
} from './prompts/validation.js';

export interface ValidationIssue {
  testId: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  suggestion?: string;
}

export interface MissingTest {
  wcagCriteria: string;
  description: string;
  reason: string;
}

export interface ValidationResult {
  confidence: number;
  shouldLoop: boolean;
  issues: ValidationIssue[];
  missingTests: MissingTest[];
  feedback?: string;
}

const MAX_RETRIES = 2;

const FALLBACK_RESULT: ValidationResult = {
  confidence: 30,
  shouldLoop: false,
  issues: [],
  missingTests: [],
  feedback: 'Validation could not be completed — returning low-confidence fallback.',
};

export async function validateWalkthrough(
  walkthrough: AnalysisResult,
  analysisResults: string,
  componentType: string,
): Promise<ValidationResult> {
  let model;
  try {
    model = createModel('validation');
  } catch {
    // If validation provider is not configured, return fallback
    return { ...FALLBACK_RESULT, feedback: 'Validation LLM provider not configured.' };
  }

  const userPrompt = VALIDATION_USER_PROMPT.replace('{componentType}', componentType)
    .replace('{analysisResults}', analysisResults)
    .replace('{walkthrough}', JSON.stringify(walkthrough, null, 2))
    .replace('{validationSchema}', JSON.stringify(VALIDATION_SCHEMA, null, 2));

  const tracingConfig = getTracingCallbacks({
    runName: 'walkthrough-validation',
    tags: ['validation', componentType],
    metadata: { componentType, attempt: 0 },
  });

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (tracingConfig?.metadata) {
      tracingConfig.metadata.attempt = attempt;
    }
    try {
      const response = await model.invoke(
        [new SystemMessage(VALIDATION_SYSTEM_PROMPT), new HumanMessage(userPrompt)],
        tracingConfig,
      );

      const content =
        typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);

      const parsed = extractJson(content) as ValidationResult;
      validateValidationStructure(parsed);
      await flushTracing();
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES) continue;
    }
  }

  await flushTracing();
  // Graceful fallback instead of throwing
  console.warn(
    `Walkthrough validation failed after ${MAX_RETRIES + 1} attempts: ${lastError?.message}. Returning fallback result.`,
  );
  return { ...FALLBACK_RESULT };
}

function validateValidationStructure(data: unknown): asserts data is ValidationResult {
  if (!data || typeof data !== 'object') {
    throw new Error('Response is not an object');
  }

  const obj = data as Record<string, unknown>;

  if (typeof obj.confidence !== 'number' || obj.confidence < 0 || obj.confidence > 100) {
    throw new Error('Missing or invalid "confidence" (must be number 0-100)');
  }

  if (typeof obj.shouldLoop !== 'boolean') {
    throw new Error('Missing or invalid "shouldLoop" boolean');
  }

  if (!Array.isArray(obj.issues)) {
    throw new Error('Missing or invalid "issues" array');
  }

  if (!Array.isArray(obj.missingTests)) {
    throw new Error('Missing or invalid "missingTests" array');
  }
}

export function getValidationModelName(): string {
  return getModelName('validation');
}
