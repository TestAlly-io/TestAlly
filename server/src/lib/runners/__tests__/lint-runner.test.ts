import { describe, it, expect, vi } from 'vitest';
import { LintRunner } from '../lint-runner.js';
import type { LintInput } from '../lint-runner.js';

vi.mock('../../analysis/axe-runner.js', () => ({
  runAxeAnalysis: vi.fn().mockResolvedValue({
    violations: [
      {
        id: 'image-alt',
        impact: 'critical',
        description: 'Images must have alternate text',
        help: 'Images must have alternate text',
        helpUrl: 'https://dequeuniversity.com/rules/axe/4.0/image-alt',
        nodes: [{ html: '<img src="a.png">', target: ['img'], failureSummary: 'Fix any of the following: ...' }],
      },
    ],
    passes: 0,
    incomplete: 0,
    axeVersion: '4.0.0',
  }),
}));

vi.mock('../../analysis/eslint-runner.js', () => ({
  runEslintAnalysis: vi.fn().mockResolvedValue([
    { ruleId: 'jsx-a11y/alt-text', severity: 2, message: 'img elements must have an alt prop', line: 1, column: 1 },
  ]),
}));

vi.mock('../../analysis/custom-rules/index.js', () => ({
  runCustomRules: vi.fn().mockReturnValue([
    {
      ruleId: 'link-as-button',
      ruleName: 'Link used as button',
      wcagCriteria: ['4.1.2'],
      message: 'Anchor without href used as button',
      fixGuidance: 'Use a <button> element instead',
      elements: [{ html: '<a onClick="handler()">Click</a>' }],
    },
  ]),
}));

const sampleInput: LintInput = {
  analysisInput: {
    code: '<img src="a.png"><a onClick="handler()">Click</a>',
    language: 'html',
  },
};

describe('LintRunner', () => {
  it('aggregates results from axe, eslint, and custom rules', async () => {
    const runner = new LintRunner();
    const result = await runner.execute(sampleInput);

    expect(result.axeViolations).toHaveLength(1);
    expect(result.axeViolations[0].id).toBe('image-alt');
    expect(result.eslintMessages).toHaveLength(1);
    expect(result.eslintMessages[0].ruleId).toBe('jsx-a11y/alt-text');
    expect(result.customRuleFlags).toHaveLength(1);
    expect(result.customRuleFlags[0].ruleId).toBe('link-as-button');
  });

  it('passes code and language to eslint runner', async () => {
    const { runEslintAnalysis } = await import('../../analysis/eslint-runner.js');
    const runner = new LintRunner();
    await runner.execute(sampleInput);

    expect(runEslintAnalysis).toHaveBeenCalledWith(sampleInput.analysisInput.code, 'html');
  });

  it('passes optional css and js to custom rules', async () => {
    const { runCustomRules } = await import('../../analysis/custom-rules/index.js');
    const runner = new LintRunner();
    const inputWithCss: LintInput = {
      analysisInput: { code: '<div></div>', language: 'html', css: '.foo { outline: none }', js: 'onClick()' },
    };
    await runner.execute(inputWithCss);

    expect(runCustomRules).toHaveBeenCalledWith('<div></div>', '.foo { outline: none }', 'onClick()');
  });
});
