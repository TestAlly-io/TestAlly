// STUB — will be replaced by full CSS analysis (see planning/013)
import type { CssFlag } from '../../types/analysis.js';

export interface CssAnalysisResult {
  flags: CssFlag[];
  hasVisibleFocusStyles: boolean;
  usesHighContrastMedia: boolean;
}

export function analyzeCss(_css: string): CssAnalysisResult {
  return { flags: [], hasVisibleFocusStyles: false, usesHighContrastMedia: false };
}
