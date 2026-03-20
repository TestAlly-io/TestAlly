export type SourceLanguage = 'html' | 'jsx' | 'tsx' | 'vue' | 'svelte';

export interface AnalysisInput {
  code: string;
  language: SourceLanguage;
  description?: string;
  css?: string;
  js?: string;
}

/**
 * Result from axe-core analysis.
 */
export interface AxeViolation {
  id: string;
  impact: 'minor' | 'moderate' | 'serious' | 'critical';
  description: string;
  help: string;
  helpUrl: string;
  nodes: Array<{
    html: string;
    target: string[];
    failureSummary: string;
  }>;
}

/**
 * Result from ESLint a11y linting.
 */
export interface EslintMessage {
  ruleId: string;
  severity: 1 | 2; // 1 = warning, 2 = error
  message: string;
  line: number;
  column: number;
}

/**
 * Result from a custom rule detector.
 */
export interface CustomRuleFlag {
  ruleId: string;
  ruleName: string;
  wcagCriteria: string[];
  message: string;
  fixGuidance: string;
  elements: Array<{
    html: string;
    line?: number;
  }>;
}

/**
 * Combined results from all static analysis tools.
 */
export interface AutomatedResults {
  axeViolations: AxeViolation[];
  eslintMessages: EslintMessage[];
  customRuleFlags: CustomRuleFlag[];
}

/**
 * Detected UI component pattern type.
 */
export type ComponentPatternType =
  | 'accordion'
  | 'tabs'
  | 'modal'
  | 'dialog'
  | 'dropdown'
  | 'menu'
  | 'navigation'
  | 'form'
  | 'carousel'
  | 'tooltip'
  | 'toggle'
  | 'table'
  | 'tree'
  | 'alert'
  | 'unknown';

/**
 * Event handler found in the component source.
 */
export interface DetectedEvent {
  type: string;          // e.g., 'onClick', 'onKeyDown'
  element: string;       // the element it's attached to
  line?: number;
}

/**
 * CSS accessibility concern.
 */
export interface CssFlag {
  property: string;      // e.g., 'outline'
  value: string;         // e.g., 'none'
  concern: string;       // human-readable description
  wcagCriteria: string[];
  line?: number;
}

/**
 * ARIA usage finding.
 */
export interface AriaFinding {
  role?: string;
  attributes: Record<string, string>;
  element: string;
  concern?: string;
  line?: number;
}

/**
 * Full output of the component analyzer.
 */
export interface ComponentAnalysis {
  patternType: ComponentPatternType;
  patternConfidence: number; // 0-100
  events: DetectedEvent[];
  cssFlags: CssFlag[];
  ariaFindings: AriaFinding[];
}
