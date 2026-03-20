import type { CustomRuleFlag } from '../../../types/analysis.js';

/**
 * Interface that every custom rule must implement.
 */
export interface CustomRule {
  /** Unique rule identifier */
  id: string;

  /** Human-readable rule name */
  name: string;

  /** WCAG success criteria this rule relates to */
  wcagCriteria: string[];

  /**
   * Run the rule against the provided source.
   * @param html - HTML/JSX source code
   * @param css - Optional CSS source code
   * @param js - Optional JavaScript source code
   * @returns Array of flags (empty if rule passes)
   */
  run(html: string, css?: string, js?: string): CustomRuleFlag[];
}
