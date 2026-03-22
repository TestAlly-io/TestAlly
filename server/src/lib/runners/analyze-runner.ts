import type { AnalysisInput, AutomatedResults, ComponentAnalysis } from '../../types/analysis.js';
import type { PhaseRunner } from '../phase-runner.js';
import { detectPattern } from '../analyzer/pattern-detector.js';
import { analyzeEvents } from '../analyzer/event-analyzer.js';
import { analyzeCss } from '../analyzer/css-analyzer.js';
import { analyzeAria } from '../analyzer/aria-analyzer.js';

export interface AnalyzeInput {
  analysisInput: AnalysisInput;
  lintResult: AutomatedResults;
}

/** Runs component pattern detection, event analysis, CSS analysis, and ARIA analysis. */
export class AnalyzeRunner implements PhaseRunner<AnalyzeInput, ComponentAnalysis> {
  async execute(input: AnalyzeInput): Promise<ComponentAnalysis> {
    const { code, description, css } = input.analysisInput;

    const pattern = detectPattern(code, description);
    const eventResult = analyzeEvents(code);
    const cssResult = css ? analyzeCss(css) : { flags: [] };
    const ariaResult = analyzeAria(code);

    return {
      patternType: pattern.patternType,
      patternConfidence: pattern.confidence,
      events: eventResult.events,
      cssFlags: cssResult.flags,
      ariaFindings: ariaResult.findings,
    };
  }
}

/** Stub analyze runner — resolves with a minimal unknown-pattern result. Used in tests. */
export class StubAnalyzeRunner implements PhaseRunner<AnalyzeInput, ComponentAnalysis> {
  async execute(_input: AnalyzeInput): Promise<ComponentAnalysis> {
    return {
      patternType: 'unknown',
      patternConfidence: 0,
      events: [],
      cssFlags: [],
      ariaFindings: [],
    };
  }
}
