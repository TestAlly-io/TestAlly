import type { AnalysisInput } from './analysis.js';
import type { AnalysisResult } from './ittt.js';

/**
 * Pipeline phases in execution order.
 * BUILD and RENDER are reserved for post-MVP (execution driver).
 */
export const PIPELINE_PHASES = [
  'SUBMIT',
  'LINT',
  // 'BUILD',  // post-MVP
  // 'RENDER', // post-MVP
  'ANALYZE',
  'GENERATE_VALIDATE',
  'COMPLETE',
] as const;

export type PipelinePhase = (typeof PIPELINE_PHASES)[number];

export type JobStatus = 'accepted' | 'in_progress' | 'completed' | 'failed';

export interface JobError {
  message: string;
  phase?: PipelinePhase;
  code?: string;
}

export interface Job {
  id: string;
  status: JobStatus;
  phase: PipelinePhase;
  phaseIndex: number;
  totalPhases: number;
  description: string;
  input: AnalysisInput;
  result: AnalysisResult | null;
  errors: JobError[];
  startedAt: string;       // ISO 8601
  updatedAt: string;       // ISO 8601
  completedAt: string | null;
  failedAt: string | null;
  /** Number of generate-validate iterations the authoring agent performed */
  iterationCount: number;
}
