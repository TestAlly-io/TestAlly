import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import type { AnalysisInput, ComponentAnalysis } from '../../types/analysis.js';
import type { AnalysisResult } from '../../types/ittt.js';
import { generateWalkthrough } from './walkthrough-generator.js';
import { validateWalkthrough } from './walkthrough-validator.js';
import type { ValidationResult } from './walkthrough-validator.js';
import { createModel } from './config.js';
import { extractJson } from './utils.js';
import {
  getCriteriaByIds,
  getAllCriteria,
} from '../wcag/knowledge-base.js';

export interface AuthoringToolsContext {
  analysisInput: AnalysisInput;
  analysisResult: ComponentAnalysis;
  /** Mutable state: the current walkthrough, updated by tools. */
  currentWalkthrough: AnalysisResult | null;
  /** Mutable state: the latest validation result. */
  currentValidation: ValidationResult | null;
  /** Mutable iteration counter (incremented per generate_walkthrough call). */
  iterationCount: number;
  /** Hard caps — whichever fires first stops further tool calls. */
  maxIterations: number;
  confidenceThreshold: number;
}

function isDone(ctx: AuthoringToolsContext): boolean {
  return (
    ctx.iterationCount >= ctx.maxIterations ||
    (ctx.currentValidation !== null &&
      ctx.currentValidation.confidence >= ctx.confidenceThreshold)
  );
}

function doneMessage(ctx: AuthoringToolsContext): string {
  const reason = ctx.iterationCount >= ctx.maxIterations
    ? `max iterations reached (${ctx.iterationCount}/${ctx.maxIterations})`
    : `confidence threshold met (${ctx.currentValidation!.confidence} >= ${ctx.confidenceThreshold})`;
  return JSON.stringify({ done: true, reason });
}

export function createAuthoringTools(ctx: AuthoringToolsContext) {
  const generateTool = tool(
    async () => {
      if (isDone(ctx)) return doneMessage(ctx);

      const analysisResults = JSON.stringify(ctx.analysisResult);
      const componentType = ctx.analysisResult.patternType;
      const description = ctx.analysisInput.description ?? componentType;

      const feedback = ctx.currentValidation?.feedback
        ?? ctx.currentValidation?.issues.map((i) => `[${i.severity}] ${i.message}`).join('\n');

      const result = await generateWalkthrough(analysisResults, componentType, description, {
        iteration: ctx.iterationCount,
        validationFeedback: feedback,
      });

      ctx.currentWalkthrough = result;
      ctx.iterationCount++;
      return JSON.stringify({
        testCount: result.manualTests.length,
        testIds: result.manualTests.map((t) => t.id),
        summary: result.summary,
      });
    },
    {
      name: 'generate_walkthrough',
      description:
        'Generate a complete ITTT manual testing walkthrough for the component. ' +
        'Uses analysis results and any prior validation feedback to produce tests. ' +
        'Call this first, then validate. On subsequent iterations, prior validation feedback is automatically included.',
      schema: z.object({}),
    },
  );

  const validateTool = tool(
    async () => {
      if (!ctx.currentWalkthrough) {
        return JSON.stringify({ error: 'No walkthrough generated yet. Call generate_walkthrough first.' });
      }

      // If we already passed the threshold, return the cached result
      if (ctx.currentValidation && ctx.currentValidation.confidence >= ctx.confidenceThreshold) {
        return doneMessage(ctx);
      }

      const analysisResults = JSON.stringify(ctx.analysisResult);
      const componentType = ctx.analysisResult.patternType;

      const result = await validateWalkthrough(
        ctx.currentWalkthrough,
        analysisResults,
        componentType,
        { iteration: ctx.iterationCount },
      );

      ctx.currentValidation = result;

      // Tell the agent whether it should stop
      const shouldStop = isDone(ctx);

      return JSON.stringify({
        confidence: result.confidence,
        shouldLoop: !shouldStop && result.shouldLoop,
        shouldStop,
        issueCount: result.issues.length,
        issues: result.issues,
        missingTests: result.missingTests,
        feedback: result.feedback,
      });
    },
    {
      name: 'validate_walkthrough',
      description:
        'Validate the current walkthrough against the analysis results. ' +
        'Returns a confidence score (0-100), issues found, and missing tests. ' +
        'Call this after generate_walkthrough to check quality.',
      schema: z.object({}),
    },
  );

  const reviseSectionTool = tool(
    async ({ testId, issue, suggestion }) => {
      if (isDone(ctx)) return doneMessage(ctx);
      if (!ctx.currentWalkthrough) {
        return JSON.stringify({ error: 'No walkthrough to revise. Call generate_walkthrough first.' });
      }

      const existingTest = ctx.currentWalkthrough.manualTests.find((t) => t.id === testId);
      if (!existingTest) {
        return JSON.stringify({ error: `Test "${testId}" not found in current walkthrough.` });
      }

      const model = createModel('authoring');
      const response = await model.invoke([
        new SystemMessage(
          'You are an accessibility testing expert. Revise the given manual test to fix the identified issue. ' +
          'Respond ONLY with the revised test as a JSON object matching the ManualTest schema: ' +
          '{ id, title, wcagCriteria: string[], priority, steps: [{ action, expected, ifFail }], sources: string[] }',
        ),
        new HumanMessage(
          `Current test:\n${JSON.stringify(existingTest, null, 2)}\n\n` +
          `Issue: ${issue}\n\nSuggested fix: ${suggestion}\n\n` +
          'Return the revised test as JSON.',
        ),
      ]);

      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

      try {
        const revised = extractJson(content) as typeof existingTest;
        // Replace the test in the walkthrough
        const idx = ctx.currentWalkthrough.manualTests.findIndex((t) => t.id === testId);
        if (idx !== -1) {
          ctx.currentWalkthrough.manualTests[idx] = revised;
        }
        return JSON.stringify({ success: true, revisedTestId: revised.id });
      } catch {
        return JSON.stringify({ error: 'Failed to parse revised test from LLM response.' });
      }
    },
    {
      name: 'revise_section',
      description:
        'Surgically revise a single test in the current walkthrough to fix a specific issue. ' +
        'More efficient than regenerating the entire walkthrough when only one test needs fixing.',
      schema: z.object({
        testId: z.string().describe('The ID of the test to revise'),
        issue: z.string().describe('The issue to fix in this test'),
        suggestion: z.string().describe('How the test should be revised'),
      }),
    },
  );

  const addMissingTestTool = tool(
    async ({ wcagCriteria, description, reason, componentType }) => {
      if (isDone(ctx)) return doneMessage(ctx);
      if (!ctx.currentWalkthrough) {
        return JSON.stringify({ error: 'No walkthrough to add to. Call generate_walkthrough first.' });
      }

      const model = createModel('authoring');
      const response = await model.invoke([
        new SystemMessage(
          'You are an accessibility testing expert. Generate a single manual test in ITTT format for the specified gap. ' +
          'Respond ONLY with a JSON object matching: ' +
          '{ id, title, wcagCriteria: string[], priority, steps: [{ action, expected, ifFail }], sources: string[] }',
        ),
        new HumanMessage(
          `Component type: ${componentType}\n` +
          `WCAG criteria to test: ${wcagCriteria}\n` +
          `What needs testing: ${description}\n` +
          `Why it's missing: ${reason}\n\n` +
          `Existing tests: ${ctx.currentWalkthrough.manualTests.map((t) => t.id).join(', ')}\n\n` +
          'Generate a new, non-duplicate test for this gap. Return as JSON.',
        ),
      ]);

      const content = typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

      try {
        const newTest = extractJson(content) as (typeof ctx.currentWalkthrough.manualTests)[number];
        ctx.currentWalkthrough.manualTests.push(newTest);
        return JSON.stringify({ success: true, addedTestId: newTest.id, totalTests: ctx.currentWalkthrough.manualTests.length });
      } catch {
        return JSON.stringify({ error: 'Failed to parse new test from LLM response.' });
      }
    },
    {
      name: 'add_missing_test',
      description:
        'Add a single new manual test for a gap identified during validation. ' +
        'Use this when validation reports missing test coverage for specific WCAG criteria.',
      schema: z.object({
        wcagCriteria: z.string().describe('The WCAG criteria ID(s) to cover, e.g. "2.1.1"'),
        description: z.string().describe('What needs to be tested'),
        reason: z.string().describe('Why this test is needed'),
        componentType: z.string().describe('The component type being tested'),
      }),
    },
  );

  const queryWcagTool = tool(
    async ({ criteriaIds, query }) => {
      if (criteriaIds && criteriaIds.length > 0) {
        const results = getCriteriaByIds(criteriaIds);
        return JSON.stringify(results);
      }
      // Return all criteria if no specific IDs and query is provided
      const all = getAllCriteria();
      if (query) {
        const q = query.toLowerCase();
        const filtered = all.filter(
          (c) =>
            c.id.includes(q) ||
            c.title.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q),
        );
        return JSON.stringify(filtered);
      }
      return JSON.stringify(all);
    },
    {
      name: 'query_wcag_criteria',
      description:
        'Look up WCAG success criteria from the knowledge base. ' +
        'Provide specific criteria IDs (e.g., ["2.1.1", "4.1.2"]) or a text query to search. ' +
        'No LLM call — pure knowledge base lookup.',
      schema: z.object({
        criteriaIds: z.array(z.string()).optional().describe('Specific WCAG criteria IDs to look up'),
        query: z.string().optional().describe('Text query to search criteria titles and descriptions'),
      }),
    },
  );

  return [generateTool, validateTool, reviseSectionTool, addMissingTestTool, queryWcagTool];
}
