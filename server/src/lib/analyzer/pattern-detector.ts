import * as htmlparser2 from 'htmlparser2';
import type { ComponentPatternType } from '../../types/analysis.js';

export interface PatternDetectionResult {
  patternType: ComponentPatternType;
  confidence: number; // 0-100
  signals: string[];  // What led to the detection
}

interface Signal {
  pattern: ComponentPatternType;
  weight: number;
  reason: string;
}

/**
 * Detects the UI pattern type from source code and optional description.
 *
 * Uses a weighted signal approach:
 * - ARIA roles and attributes
 * - HTML structure and semantic elements
 * - CSS class name heuristics
 * - User-provided description
 */
export function detectPattern(
  html: string,
  description?: string,
): PatternDetectionResult {
  const signals: Signal[] = [];

  gatherHtmlSignals(html, signals);

  if (description) {
    gatherDescriptionSignals(description, signals);
  }

  // Tally scores per pattern
  const scores = new Map<ComponentPatternType, { total: number; signals: string[] }>();

  for (const signal of signals) {
    const entry = scores.get(signal.pattern) ?? { total: 0, signals: [] };
    entry.total += signal.weight;
    entry.signals.push(signal.reason);
    scores.set(signal.pattern, entry);
  }

  if (scores.size === 0) {
    return { patternType: 'unknown', confidence: 10, signals: ['No recognizable signals found'] };
  }

  // Find highest scoring pattern
  let best: ComponentPatternType = 'unknown';
  let bestScore = 0;
  let bestSignals: string[] = [];

  for (const [pattern, entry] of scores) {
    if (entry.total > bestScore) {
      best = pattern;
      bestScore = entry.total;
      bestSignals = entry.signals;
    }
  }

  // Normalize confidence: cap at 95 (only LLM validation can push higher)
  const confidence = Math.min(95, Math.round(bestScore));

  return { patternType: best, confidence, signals: bestSignals };
}

function gatherHtmlSignals(html: string, signals: Signal[]): void {
  const roles = new Set<string>();
  const tags = new Set<string>();
  const ariaAttrs = new Set<string>();
  const classNames: string[] = [];

  const parser = new htmlparser2.Parser({
    onopentag(name, attribs) {
      tags.add(name);

      if (attribs['role']) {
        roles.add(attribs['role']);
      }

      for (const attr of Object.keys(attribs)) {
        if (attr.startsWith('aria-')) {
          ariaAttrs.add(attr);
        }
      }

      if (attribs['class']) {
        classNames.push(...attribs['class'].split(/\s+/));
      }
      if (attribs['className']) {
        classNames.push(...attribs['className'].split(/\s+/));
      }
    },
  }, { recognizeSelfClosing: true });

  parser.write(html);
  parser.end();

  // Role-based signals (strongest)
  const rolePatternMap: Record<string, ComponentPatternType> = {
    'tablist': 'tabs',
    'tab': 'tabs',
    'tabpanel': 'tabs',
    'dialog': 'modal',
    'alertdialog': 'modal',
    'menu': 'menu',
    'menubar': 'menu',
    'menuitem': 'menu',
    'navigation': 'navigation',
    'tree': 'tree',
    'treeitem': 'tree',
    'tooltip': 'tooltip',
    'alert': 'alert',
    'switch': 'toggle',
  };

  for (const role of roles) {
    if (role in rolePatternMap) {
      signals.push({ pattern: rolePatternMap[role], weight: 40, reason: `role="${role}"` });
    }
  }

  // ARIA attribute signals
  if (ariaAttrs.has('aria-expanded')) {
    signals.push({ pattern: 'accordion', weight: 25, reason: 'aria-expanded attribute' });
  }
  if (ariaAttrs.has('aria-selected') && roles.has('tab')) {
    signals.push({ pattern: 'tabs', weight: 30, reason: 'aria-selected on tabs' });
  }
  if (ariaAttrs.has('aria-modal')) {
    signals.push({ pattern: 'modal', weight: 40, reason: 'aria-modal attribute' });
  }
  if (ariaAttrs.has('aria-haspopup')) {
    signals.push({ pattern: 'dropdown', weight: 30, reason: 'aria-haspopup attribute' });
  }

  // Tag-based signals
  if (tags.has('dialog')) {
    signals.push({ pattern: 'modal', weight: 35, reason: '<dialog> element' });
  }
  if (tags.has('nav')) {
    signals.push({ pattern: 'navigation', weight: 35, reason: '<nav> element' });
  }
  if (tags.has('form')) {
    signals.push({ pattern: 'form', weight: 30, reason: '<form> element' });
  }
  if (tags.has('table')) {
    signals.push({ pattern: 'table', weight: 30, reason: '<table> element' });
  }
  if (tags.has('select')) {
    signals.push({ pattern: 'dropdown', weight: 25, reason: '<select> element' });
  }

  // Class name signals (single parse, weakest signal)
  const joined = classNames.join(' ').toLowerCase();

  const classPatterns: Array<{ keywords: RegExp[]; pattern: ComponentPatternType }> = [
    { keywords: [/\baccordion\b/], pattern: 'accordion' },
    { keywords: [/\btabs?\b/, /\btabbed\b/], pattern: 'tabs' },
    { keywords: [/\bmodal\b/, /\bdialog\b/], pattern: 'modal' },
    { keywords: [/\bdropdown\b/, /\bselect\b/], pattern: 'dropdown' },
    { keywords: [/\bmenu\b/, /\bnav\b/], pattern: 'menu' },
    { keywords: [/\bcarousel\b/, /\bslider\b/], pattern: 'carousel' },
    { keywords: [/\btooltip\b/], pattern: 'tooltip' },
    { keywords: [/\btoggle\b/, /\bswitch\b/], pattern: 'toggle' },
  ];

  for (const { keywords, pattern } of classPatterns) {
    for (const keyword of keywords) {
      if (keyword.test(joined)) {
        signals.push({ pattern, weight: 15, reason: `CSS class matches ${keyword}` });
        break;
      }
    }
  }
}

function gatherDescriptionSignals(description: string, signals: Signal[]): void {
  const desc = description.toLowerCase();

  const descriptionPatterns: Array<{ keywords: RegExp[]; pattern: ComponentPatternType }> = [
    { keywords: [/\baccordion\b/], pattern: 'accordion' },
    { keywords: [/\btabs?\b/, /\btabbed\b/], pattern: 'tabs' },
    { keywords: [/\bmodal\b/, /\bdialog\b/, /\bpopup\b/, /\boverlay\b/], pattern: 'modal' },
    { keywords: [/\bdropdown\b/, /\bselect\b/, /\bcombobox\b/, /\blistbox\b/], pattern: 'dropdown' },
    { keywords: [/\bmenu\b/, /\bmenubar\b/], pattern: 'menu' },
    { keywords: [/\bnav\b/, /\bnavigation\b/, /\bnavbar\b/, /\bsidebar\b/], pattern: 'navigation' },
    { keywords: [/\bform\b/, /\blogin\b/, /\bsignup\b/, /\bregister\b/], pattern: 'form' },
    { keywords: [/\bcarousel\b/, /\bslider\b/, /\bslideshow\b/], pattern: 'carousel' },
    { keywords: [/\btooltip\b/, /\bpopover\b/], pattern: 'tooltip' },
    { keywords: [/\btoggle\b/, /\bswitch\b/], pattern: 'toggle' },
    { keywords: [/\btable\b/, /\bdata grid\b/, /\bdatagrid\b/], pattern: 'table' },
    { keywords: [/\btree\b/, /\btreeview\b/], pattern: 'tree' },
    { keywords: [/\balert\b/, /\bnotification\b/, /\btoast\b/, /\bbanner\b/], pattern: 'alert' },
  ];

  for (const { keywords, pattern } of descriptionPatterns) {
    for (const keyword of keywords) {
      if (keyword.test(desc)) {
        signals.push({ pattern, weight: 30, reason: `Description matches ${keyword}` });
        break;
      }
    }
  }
}
