import type { AnalysisResult, AnalysisMetadata } from './ittt.js';
import type { PipelinePhase, JobError } from './job.js';

// --- Request types ---

// Minimal stub — expanded when shared types (004) are fully implemented.
export interface AnalyzeRequest {
  code: string;
  language: string;
  description?: string;
  css?: string;
  js?: string;
}

// --- Response types ---

export interface AnalyzeResponse {
  status: 'accepted';
  jobId: string;
  statusUrl: string;
  resultsUrl: string;
}

export interface StatusResponseInProgress {
  status: 'in_progress';
  jobId: string;
  phase: PipelinePhase;
  phaseIndex: number;
  totalPhases: number;
  description: string;
  startedAt: string;
  updatedAt: string;
}

export interface StatusResponseCompleted {
  status: 'completed';
  jobId: string;
  phase: 'COMPLETE';
  description: string;
  startedAt: string;
  completedAt: string;
  resultsUrl: string;
}

export interface StatusResponseFailed {
  status: 'failed';
  jobId: string;
  phase: PipelinePhase;
  description: string;
  errors: JobError[];
  startedAt: string;
  failedAt: string;
}

export type StatusResponse =
  | StatusResponseInProgress
  | StatusResponseCompleted
  | StatusResponseFailed;

export interface ManualTestResponseSuccess {
  status: 'success';
  jobId: string;
  analysis: AnalysisResult;
  metadata: AnalysisMetadata;
}

export interface ManualTestResponseInProgress {
  status: 'in_progress';
  jobId: string;
  message: string;
  statusUrl: string;
}

export type ManualTestResponse =
  | ManualTestResponseSuccess
  | ManualTestResponseInProgress;

export interface ErrorResponse {
  error: string;
  message: string;
  statusCode: number;
}

export interface HealthResponse {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  checks: {
    llmPrimary: 'connected' | 'disconnected' | 'unconfigured';
    llmValidation: 'connected' | 'disconnected' | 'unconfigured';
    axeCore: 'loaded' | 'error';
  };
}
