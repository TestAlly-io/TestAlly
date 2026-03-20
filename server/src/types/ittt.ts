import type { AxeViolation, EslintMessage, CustomRuleFlag } from './analysis.js';

/**
 * A single test step in the If-This-Then-That format.
 */
export interface TestStep {
  /** The action the tester should perform */
  action: string;
  /** The expected result if the component is accessible */
  expected: string;
  /** What it means if the expected result doesn't happen, and how to fix it */
  ifFail: string;
}

export type TestPriority = 'critical' | 'serious' | 'moderate' | 'minor';

/**
 * A complete manual test scenario.
 */
export interface ManualTest {
  id: string;
  title: string;
  wcagCriteria: string[];
  priority: TestPriority;
  steps: TestStep[];
  sources: string[];
}

/**
 * A getting-started guide for an assistive technology tool.
 * Included in the output when the walkthrough contains screen reader test steps.
 */
export interface AssistiveTechGuideLink {
  tool: string;         // e.g., "VoiceOver", "NVDA"
  platform: string;     // e.g., "macOS/iOS", "Windows"
  guideUrl: string;     // URL to getting-started tutorial
  label: string;        // Human-readable link label
}

/**
 * Resources included when the walkthrough references assistive technologies.
 */
export interface WalkthroughResources {
  screenReaderGuides: AssistiveTechGuideLink[];
}

/**
 * The full analysis result returned to the client.
 */
export interface AnalysisResult {
  component: {
    type: string;
    description: string;
    confidence: number; // 0-100
  };
  automatedResults: {
    axeViolations: AxeViolation[];
    eslintMessages: EslintMessage[];
    customRuleFlags: CustomRuleFlag[];
  };
  manualTests: ManualTest[];
  /** Assistive technology guides, present only when walkthrough includes screen reader test steps */
  resources?: WalkthroughResources;
  allClear: boolean;
  summary: string;
}

/**
 * Metadata about the analysis run.
 */
export interface AnalysisMetadata {
  analysisTimeMs: number;
  llmModelPrimary: string;
  llmModelValidation: string;
  axeVersion: string;
}
