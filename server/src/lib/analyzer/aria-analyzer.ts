// STUB — will be replaced by full ARIA analysis (see planning/014)
import type { AriaFinding } from '../../types/analysis.js';

export interface AriaAnalysisResult {
  findings: AriaFinding[];
  hasLiveRegions: boolean;
  hasLandmarks: boolean;
}

export function analyzeAria(_html: string): AriaAnalysisResult {
  return { findings: [], hasLiveRegions: false, hasLandmarks: false };
}
