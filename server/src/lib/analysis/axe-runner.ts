import axe from 'axe-core';
import { JSDOM } from 'jsdom';

import type { AxeViolation } from '../../types/analysis.js';

export interface AxeRunnerResult {
  violations: AxeViolation[];
  passes: number;
  incomplete: number;
  axeVersion: string;
}

const FULL_DOC_PREFIX = '<!DOCTYPE html><html lang="en"><head><title>Test</title></head><body>';
const FULL_DOC_SUFFIX = '</body></html>';

function ensureFullHtmlDocument(html: string): string {
  if (/<html[\s>]/i.test(html)) {
    return html;
  }
  return `${FULL_DOC_PREFIX}${html}${FULL_DOC_SUFFIX}`;
}

function toImpact(
  impact: import('axe-core').ImpactValue | undefined
): AxeViolation['impact'] {
  if (
    impact === 'minor' ||
    impact === 'moderate' ||
    impact === 'serious' ||
    impact === 'critical'
  ) {
    return impact;
  }
  return 'minor';
}

function selectorToString(
  selector: import('axe-core').CrossTreeSelector
): string {
  if (typeof selector === 'string') {
    return selector;
  }
  return selector.join(' ');
}

function mapViolations(
  violations: import('axe-core').Result[]
): AxeViolation[] {
  return violations.map((v) => ({
    id: v.id,
    impact: toImpact(v.impact),
    description: v.description,
    help: v.help,
    helpUrl: v.helpUrl,
    nodes: v.nodes.map((n) => ({
      html: n.html,
      target: n.target.map(selectorToString),
      failureSummary: n.failureSummary ?? '',
    })),
  }));
}

export async function runAxeAnalysis(html: string): Promise<AxeRunnerResult> {
  const documentHtml = ensureFullHtmlDocument(html);
  // runScripts: 'outside-only' is required so we can eval axe.source into the
  // jsdom window — axe-core needs a live DOM context to run its checks.
  const dom = new JSDOM(documentHtml, {
    runScripts: 'outside-only',
    pretendToBeVisual: true,
    beforeParse(window) {
      // Stub canvas getContext to suppress jsdom "Not implemented" errors.
      // axe-core probes canvas support but does not require it.
      window.HTMLCanvasElement.prototype.getContext = (() =>
        null) as unknown as typeof window.HTMLCanvasElement.prototype.getContext;
    },
  });
  const { window } = dom;

  try {
    window.eval(axe.source);
    const axeInWindow = (window as unknown as { axe: typeof axe }).axe;
    const results = await axeInWindow.run(window.document.documentElement);

    return {
      violations: mapViolations(results.violations),
      passes: results.passes.length,
      incomplete: results.incomplete.length,
      axeVersion: axe.version,
    };
  } finally {
    window.close();
  }
}
