// STUB — will be replaced by full event analysis (see planning/012)
import type { DetectedEvent } from '../../types/analysis.js';

export interface EventAnalysisResult {
  events: DetectedEvent[];
  hasKeyboardHandlers: boolean;
  hasMouseOnlyHandlers: boolean;
}

export function analyzeEvents(_html: string): EventAnalysisResult {
  return { events: [], hasKeyboardHandlers: false, hasMouseOnlyHandlers: false };
}
