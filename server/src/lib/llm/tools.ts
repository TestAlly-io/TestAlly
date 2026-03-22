import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import type { AnalysisInput } from '../../types/analysis.js';
import { runAxeAnalysis } from '../analysis/axe-runner.js';
import { runEslintAnalysis } from '../analysis/eslint-runner.js';
import { runCustomRules } from '../analysis/custom-rules/index.js';
import { detectPattern } from '../analyzer/pattern-detector.js';
import { analyzeEvents } from '../analyzer/event-analyzer.js';
import { analyzeCss } from '../analyzer/css-analyzer.js';
import { analyzeAria } from '../analyzer/aria-analyzer.js';

export function createAnalysisTools(input: AnalysisInput) {
  const axeTool = tool(
    async () => {
      const result = await runAxeAnalysis(input.code);
      return JSON.stringify(result);
    },
    {
      name: 'run_axe_analysis',
      description:
        'Run axe-core automated accessibility checks on the component HTML. Returns violations with WCAG criteria references.',
      schema: z.object({}),
    },
  );

  const eslintTool = tool(
    async () => {
      const result = await runEslintAnalysis(input.code, input.language);
      return JSON.stringify(result);
    },
    {
      name: 'run_eslint_a11y',
      description:
        'Run ESLint jsx-a11y rules on the component source code. Returns lint messages with severity and rule IDs.',
      schema: z.object({}),
    },
  );

  const customRulesTool = tool(
    async () => {
      const result = runCustomRules(input.code, input.css, input.js);
      return JSON.stringify(result);
    },
    {
      name: 'run_custom_rules',
      description:
        'Run custom accessibility rules (link-as-button detector, focus ring removal detector). Returns flagged issues with fix guidance.',
      schema: z.object({}),
    },
  );

  const patternTool = tool(
    async () => {
      const result = detectPattern(input.code, input.description);
      return JSON.stringify(result);
    },
    {
      name: 'detect_component_pattern',
      description:
        'Detect the UI component pattern type (e.g., modal, tabs, accordion, form). Returns pattern type and confidence score.',
      schema: z.object({}),
    },
  );

  const eventTool = tool(
    async () => {
      const result = analyzeEvents(input.code);
      return JSON.stringify(result);
    },
    {
      name: 'analyze_events',
      description:
        'Analyze event handlers in the component to find keyboard vs mouse-only interactions. Returns detected events and keyboard accessibility flags.',
      schema: z.object({}),
    },
  );

  const cssAriaTool = tool(
    async () => {
      const cssResult = input.css ? analyzeCss(input.css) : { flags: [], hasAnimations: false, hasReducedMotionQuery: false };
      const ariaResult = analyzeAria(input.code);
      return JSON.stringify({ css: cssResult, aria: ariaResult });
    },
    {
      name: 'analyze_css_and_aria',
      description:
        'Analyze CSS for accessibility concerns (focus visibility, contrast) and ARIA usage (roles, attributes, live regions). Returns combined CSS flags and ARIA findings.',
      schema: z.object({}),
    },
  );

  return [axeTool, eslintTool, customRulesTool, patternTool, eventTool, cssAriaTool];
}
