// STUB — will be replaced by full pattern detection (see planning/011)
import type { ComponentPatternType } from '../../types/analysis.js';

export interface PatternDetectionResult {
  patternType: ComponentPatternType;
  confidence: number;
  indicators: string[];
}

export function detectPattern(
  _html: string,
  _description?: string,
  _css?: string,
): PatternDetectionResult {
  return { patternType: 'unknown', confidence: 0, indicators: [] };
}
