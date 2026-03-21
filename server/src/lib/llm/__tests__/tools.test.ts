import { describe, it, expect } from 'vitest';
import { createAnalysisTools } from '../tools.js';
import type { AnalysisInput } from '../../../types/analysis.js';

const SAMPLE_INPUT: AnalysisInput = {
  code: '<button onClick="doStuff()">Click me</button>',
  language: 'html',
  description: 'A simple button component',
  css: 'button:focus { outline: none; }',
};

describe('createAnalysisTools', () => {
  it('returns 6 tools', () => {
    const tools = createAnalysisTools(SAMPLE_INPUT);
    expect(tools).toHaveLength(6);
  });

  it('each tool has a name and description', () => {
    const tools = createAnalysisTools(SAMPLE_INPUT);
    for (const t of tools) {
      expect(typeof t.name).toBe('string');
      expect(t.name.length).toBeGreaterThan(0);
      expect(typeof t.description).toBe('string');
      expect(t.description.length).toBeGreaterThan(0);
    }
  });

  it('all tool names are unique', () => {
    const tools = createAnalysisTools(SAMPLE_INPUT);
    const names = tools.map((t) => t.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('run_axe_analysis returns parseable JSON', async () => {
    const tools = createAnalysisTools(SAMPLE_INPUT);
    const axeTool = tools.find((t) => t.name === 'run_axe_analysis')!;
    const result = await axeTool.invoke({});
    expect(() => JSON.parse(result as string)).not.toThrow();
  });

  it('run_eslint_a11y returns parseable JSON', async () => {
    const tools = createAnalysisTools(SAMPLE_INPUT);
    const eslintTool = tools.find((t) => t.name === 'run_eslint_a11y')!;
    const result = await eslintTool.invoke({});
    expect(() => JSON.parse(result as string)).not.toThrow();
  });

  it('run_custom_rules returns parseable JSON', async () => {
    const tools = createAnalysisTools(SAMPLE_INPUT);
    const customTool = tools.find((t) => t.name === 'run_custom_rules')!;
    const result = await customTool.invoke({});
    expect(() => JSON.parse(result as string)).not.toThrow();
  });

  it('detect_component_pattern returns parseable JSON', async () => {
    const tools = createAnalysisTools(SAMPLE_INPUT);
    const patternTool = tools.find((t) => t.name === 'detect_component_pattern')!;
    const result = await patternTool.invoke({});
    const parsed = JSON.parse(result as string);
    expect(parsed).toHaveProperty('patternType');
    expect(parsed).toHaveProperty('confidence');
  });

  it('analyze_events returns parseable JSON', async () => {
    const tools = createAnalysisTools(SAMPLE_INPUT);
    const eventTool = tools.find((t) => t.name === 'analyze_events')!;
    const result = await eventTool.invoke({});
    const parsed = JSON.parse(result as string);
    expect(parsed).toHaveProperty('events');
  });

  it('analyze_css_and_aria returns parseable JSON with both sections', async () => {
    const tools = createAnalysisTools(SAMPLE_INPUT);
    const cssAriaTool = tools.find((t) => t.name === 'analyze_css_and_aria')!;
    const result = await cssAriaTool.invoke({});
    const parsed = JSON.parse(result as string);
    expect(parsed).toHaveProperty('css');
    expect(parsed).toHaveProperty('aria');
  });
});
