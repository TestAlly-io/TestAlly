import type { CustomRule } from './types.js';
import type { CustomRuleFlag } from '../../../types/analysis.js';
import { linkAsButtonRule } from './link-as-button.js';
import { focusRingRule } from './focus-ring.js';

export type { CustomRule } from './types.js';

/** All registered custom rules */
const rules: CustomRule[] = [linkAsButtonRule, focusRingRule];

/**
 * Run all custom rules against the provided source.
 * Returns aggregated flags from all rules.
 */
export function runCustomRules(
  html: string,
  css?: string,
  js?: string,
): CustomRuleFlag[] {
  const allFlags: CustomRuleFlag[] = [];

  for (const rule of rules) {
    const flags = rule.run(html, css, js);
    allFlags.push(...flags);
  }

  return allFlags;
}

/**
 * Get metadata for all registered rules.
 */
export function getRegisteredRules(): Array<{
  id: string;
  name: string;
  wcagCriteria: string[];
}> {
  return rules.map((r) => ({
    id: r.id,
    name: r.name,
    wcagCriteria: r.wcagCriteria,
  }));
}
