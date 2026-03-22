import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnalyzeRunner } from '../analyze-runner.js';
import type { AnalyzeInput } from '../analyze-runner.js';
import type { AutomatedResults } from '../../../types/analysis.js';

vi.mock('../../analyzer/pattern-detector.js', () => ({
  detectPattern: vi.fn().mockReturnValue({
    patternType: 'accordion',
    confidence: 85,
    signals: ['aria-expanded', 'panel toggle'],
  }),
}));

vi.mock('../../analyzer/event-analyzer.js', () => ({
  analyzeEvents: vi.fn().mockReturnValue({
    events: [{ type: 'click', element: 'button', line: 3 }],
    keyboardGaps: [],
  }),
}));

vi.mock('../../analyzer/css-analyzer.js', () => ({
  analyzeCss: vi.fn().mockReturnValue({
    flags: [{ type: 'focus-ring-removal', selector: '.btn', line: 2 }],
    hasAnimations: false,
    hasReducedMotionQuery: false,
  }),
}));

vi.mock('../../analyzer/aria-analyzer.js', () => ({
  analyzeAria: vi.fn().mockReturnValue({
    findings: [{ type: 'missing-role', element: 'div', suggestion: 'Add role="region"' }],
    hasLiveRegions: false,
    hasLandmarks: false,
  }),
}));

const emptyLintResult: AutomatedResults = {
  axeViolations: [],
  eslintMessages: [],
  customRuleFlags: [],
};

const sampleInput: AnalyzeInput = {
  analysisInput: {
    code: '<div class="accordion"><button aria-expanded="false">Toggle</button><div class="panel">Content</div></div>',
    language: 'html',
    description: 'Accordion component',
    css: '.btn { outline: none; }',
  },
  lintResult: emptyLintResult,
};

describe('AnalyzeRunner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns aggregated analysis from all analyzers', async () => {
    const runner = new AnalyzeRunner();
    const result = await runner.execute(sampleInput);

    expect(result.patternType).toBe('accordion');
    expect(result.patternConfidence).toBe(85);
    expect(result.events).toHaveLength(1);
    expect(result.cssFlags).toHaveLength(1);
    expect(result.ariaFindings).toHaveLength(1);
  });

  it('uses empty css flags when no css is provided', async () => {
    const runner = new AnalyzeRunner();
    const inputWithoutCss: AnalyzeInput = {
      analysisInput: { code: '<div>test</div>', language: 'html' },
      lintResult: emptyLintResult,
    };

    const result = await runner.execute(inputWithoutCss);

    expect(result.cssFlags).toEqual([]);
  });

  it('skips analyzeCss when css is undefined', async () => {
    const { analyzeCss } = await import('../../analyzer/css-analyzer.js');
    const runner = new AnalyzeRunner();
    const inputWithoutCss: AnalyzeInput = {
      analysisInput: { code: '<div>test</div>', language: 'html' },
      lintResult: emptyLintResult,
    };

    await runner.execute(inputWithoutCss);

    expect(analyzeCss).not.toHaveBeenCalled();
  });

  it('calls analyzeCss when css is provided', async () => {
    const { analyzeCss } = await import('../../analyzer/css-analyzer.js');
    const runner = new AnalyzeRunner();

    await runner.execute(sampleInput);

    expect(analyzeCss).toHaveBeenCalledWith('.btn { outline: none; }');
  });
});
