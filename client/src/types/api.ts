/**
 * Client-side types for API communication.
 * These mirror the server response shapes.
 */

export interface AnalyzeRequest {
  code: string;
  language: 'html' | 'jsx' | 'tsx' | 'vue' | 'svelte';
  description?: string;
  css?: string;
  js?: string;
}

/** Response from POST /api/infer-component (infer language/pattern/summary from component source). */
export interface InferComponentResponse {
  language: AnalyzeRequest['language'];
  componentKind: string;
  /** Inferred testing focus from source; client sends original paste as `code` to analyze. */
  description: string;
  /** Often empty when the API expects the client to keep the original source. */
  code: string;
  css?: string;
  js?: string;
}

export interface AnalyzeResponse {
  status: 'accepted';
  jobId: string;
  statusUrl: string;
  resultsUrl: string;
}

export interface JobStatus {
  status: 'in_progress' | 'completed' | 'failed';
  jobId: string;
  phase: string;
  phaseIndex?: number;
  totalPhases?: number;
  description: string;
  startedAt: string;
  updatedAt?: string;
  completedAt?: string;
  failedAt?: string;
  resultsUrl?: string;
  errors?: Array<{ message: string }>;
}

export interface TestStep {
  action: string;
  expected: string;
  ifFail: string;
}

export interface ManualTest {
  id: string;
  title: string;
  wcagCriteria: string[];
  priority: 'critical' | 'serious' | 'moderate' | 'minor';
  steps: TestStep[];
  sources: string[];
}

export interface AssistiveTechGuideLink {
  tool: string;
  platform: string;
  guideUrl: string;
  label: string;
}

export interface WalkthroughResources {
  screenReaderGuides: AssistiveTechGuideLink[];
}

export interface AnalysisResult {
  component: {
    type: string;
    description: string;
    confidence: number;
  };
  automatedResults: {
    axeViolations: Array<{
      id: string;
      impact: string;
      description: string;
      help: string;
      helpUrl: string;
    }>;
    eslintMessages: Array<{
      ruleId: string;
      severity: number;
      message: string;
      line: number;
      column: number;
    }>;
    customRuleFlags: Array<{
      ruleId: string;
      ruleName: string;
      message: string;
      fixGuidance: string;
    }>;
  };
  manualTests: ManualTest[];
  /** Assistive technology guides, present only when walkthrough includes screen reader test steps */
  resources?: WalkthroughResources;
  allClear: boolean;
  summary: string;
}

export interface ManualTestResponse {
  status: 'success' | 'in_progress';
  jobId: string;
  analysis?: AnalysisResult;
  metadata?: {
    analysisTimeMs: number;
    llmModelPrimary: string;
    llmModelValidation: string;
    axeVersion: string;
  };
  message?: string;
  statusUrl?: string;
}
