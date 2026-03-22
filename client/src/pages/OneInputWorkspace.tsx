import { useState, useCallback, useMemo } from 'react';
import { inferComponent, submitAnalysis, pollJobStatus, getManualTestResults } from '../api';
import { parseCombinedInput, validateComponentSourceOnly } from '../lib/parseCombinedInput';
import { ResultsPanel } from '../components/ResultsPanel';
import type { AnalyzeRequest, JobStatus, ManualTestResponse } from '../types/api';
import styles from './OneInputWorkspace.module.css';

type AppState = 'idle' | 'submitting' | 'analyzing' | 'complete' | 'error';

type SubmitPhase = 'idle' | 'infer' | 'submit';

const PLACEHOLDER = `Paste only your component — what you ship (HTML, JSX, TSX, Vue, Svelte, etc.). No notes or instructions in this box.

Example:
export function Panel() {
  return <button type="button" aria-expanded={false}>Section</button>;
}

We’ll infer language, pattern, and what to test for accessibility.`;

interface ExtractedSummary {
  componentKind: string | null;
  language: AnalyzeRequest['language'];
  description: string;
  usedLocalFallback: boolean;
  inferError?: string;
}

/** Single-field paste + infer + analyze (combined input / heuristics). */
export function OneInputWorkspace() {
  const [paste, setPaste] = useState('');
  const [appState, setAppState] = useState<AppState>('idle');
  const [submitPhase, setSubmitPhase] = useState<SubmitPhase>('idle');
  const [progress, setProgress] = useState<JobStatus | null>(null);
  const [results, setResults] = useState<ManualTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [extracted, setExtracted] = useState<ExtractedSummary | null>(null);

  const heuristic = useMemo(() => parseCombinedInput(paste), [paste]);
  const hasExtraProse = heuristic.description.trim().length > 0;

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();

      const resolved = validateComponentSourceOnly(paste);
      if (!resolved.ok) {
        setError(resolved.message);
        setAppState('error');
        return;
      }

      const sourceCode = resolved.source;

      setAppState('submitting');
      setSubmitPhase('infer');
      setProgress(null);
      setError(null);
      setResults(null);
      setExtracted(null);

      let payload: AnalyzeRequest;
      const parsed = parseCombinedInput(paste.trim());

      try {
        const out = await inferComponent(sourceCode);
        payload = {
          code: sourceCode,
          language: out.language,
          description: out.description.trim() || undefined,
          css: out.css?.trim() || undefined,
          js: out.js?.trim() || undefined,
        };
        setExtracted({
          componentKind: out.componentKind,
          language: out.language,
          description: out.description,
          usedLocalFallback: false,
        });
      } catch (err) {
        const inferError = err instanceof Error ? err.message : 'Infer request failed';
        console.warn('[infer-component]', inferError);
        payload = {
          code: sourceCode,
          language: parsed.language,
          description: undefined,
        };
        setExtracted({
          componentKind: null,
          language: parsed.language,
          description: '',
          usedLocalFallback: true,
          inferError,
        });
      }

      try {
        setSubmitPhase('submit');
        const response = await submitAnalysis(payload);
        setAppState('analyzing');
        setSubmitPhase('idle');

        await pollJobStatus(response.jobId, (status) => {
          setProgress(status);
        });

        const testResults = await getManualTestResults(response.jobId);
        setResults(testResults);
        setAppState('complete');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
        setAppState('error');
        setSubmitPhase('idle');
      }
    },
    [paste],
  );

  const canSubmit = paste.trim().length > 0 && appState !== 'submitting' && appState !== 'analyzing';

  const primaryLabel =
    submitPhase === 'infer'
      ? 'Inferring from source…'
      : submitPhase === 'submit'
        ? 'Starting analysis…'
        : appState === 'analyzing'
          ? 'Analyzing…'
          : 'Analyze';

  return (
    <div className={styles.container}>
      <form className={styles.inputPanel} onSubmit={(e) => void handleSubmit(e)}>
        <h2 className={styles.panelTitle}>Your component</h2>

        <p className={styles.hint}>
          Drop in just the markup or component code — no separate write-up. We’ll infer language, pattern,
          and a testing angle when you run Analyze.
        </p>

        <div className={styles.field}>
          <label htmlFor="paste" className={styles.label}>
            Component Code
          </label>
          <textarea
            id="paste"
            className={styles.codeInput}
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            placeholder={PLACEHOLDER}
            spellCheck={false}
            style={{ minHeight: '250px' }}
          />
        </div>

        <div className={styles.meta} aria-live="polite">
          Guessed language (offline): <strong>{heuristic.language}</strong>
          {hasExtraProse ? (
            <span className={styles.metaWarn}>
              {' '}
              — looks like there’s commentary outside the code; trim to just the component for best results.
            </span>
          ) : heuristic.code.trim() ? (
            ' — looks like real source.'
          ) : paste.trim() ? (
            ' — paste markup or component code only (looks like plain text so far).'
          ) : null}
        </div>

        {extracted ? (
          <div className={styles.extractedBox} role="status">
            <div className={styles.extractedTitle}>Inferred from source</div>
            {extracted.usedLocalFallback ? (
              <p className={styles.fallbackNote}>
                LLM infer step failed — language from local heuristics only; no inferred testing summary.
                {extracted.inferError ? (
                  <span className={styles.inferErrorDetail}> {extracted.inferError}</span>
                ) : null}
              </p>
            ) : null}
            <ul className={styles.extractedList}>
              <li>
                <strong>Language:</strong> {extracted.language}
              </li>
              {extracted.componentKind ? (
                <li>
                  <strong>Pattern:</strong> {extracted.componentKind}
                </li>
              ) : null}
              {extracted.description.trim() ? (
                <li>
                  <strong>Testing focus:</strong> {extracted.description.trim()}
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className={styles.submitButton}
        >
          {primaryLabel}
        </button>
      </form>

      <div className={styles.resultsPanel}>
        <h2 className={styles.panelTitle}>Results</h2>

        {appState === 'idle' && (
            <p>
              When you’re ready, hit Analyze and the results will appear here.
            </p>
        )}

        {appState === 'analyzing' && progress != null && (
          <div className={styles.progress}>
            <div className={styles.progressPhase}>{progress.phase}</div>
            <p>{progress.description}</p>
            {progress.phaseIndex !== undefined && progress.totalPhases !== undefined && (
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${(progress.phaseIndex / progress.totalPhases) * 100}%` }}
                />
              </div>
            )}
          </div>
        )}

        {appState === 'error' && (
          <div className={styles.error} role="alert">
            <strong>Error:</strong> {error}
          </div>
        )}

        {appState === 'complete' &&
            results?.status === 'success' &&
            results.analysis != null && (
                <div className={styles.results}>
                  <ResultsPanel result={results.analysis} />
                </div>
            )}
      </div>
    </div>
  );
}
