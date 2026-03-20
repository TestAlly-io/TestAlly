import { useState, useCallback } from 'react';
import { submitAnalysis, pollJobStatus, getManualTestResults } from '../api';
import type { AnalyzeRequest, JobStatus, ManualTestResponse } from '../types/api';
import styles from './Home.module.css';

type AppState = 'idle' | 'submitting' | 'analyzing' | 'complete' | 'error';

export function Home() {
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState<AnalyzeRequest['language']>('html');
  const [description, setDescription] = useState('');
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');

  const [appState, setAppState] = useState<AppState>('idle');
  const [progress, setProgress] = useState<JobStatus | null>(null);
  const [results, setResults] = useState<ManualTestResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!code.trim()) return;

    setAppState('submitting');
    setError(null);
    setResults(null);

    try {
      const response = await submitAnalysis({
        code,
        language,
        description: description || undefined,
        css: css || undefined,
        js: js || undefined,
      });

      setAppState('analyzing');

      await pollJobStatus(response.jobId, (status) => {
        setProgress(status);
      });

      const testResults = await getManualTestResults(response.jobId);
      setResults(testResults);
      setAppState('complete');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setAppState('error');
    }
  }, [code, language, description, css, js]);

  return (
    <div className={styles.container}>
      <form className={styles.inputPanel} onSubmit={handleSubmit}>
        <h2 className={styles.panelTitle}>Component Input</h2>

        <div className={styles.field}>
          <label htmlFor="language" className={styles.label}>Language</label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value as AnalyzeRequest['language'])}
            className={styles.select}
          >
            <option value="html">HTML</option>
            <option value="jsx">JSX</option>
            <option value="tsx">TSX</option>
            <option value="vue">Vue</option>
            <option value="svelte">Svelte</option>
          </select>
        </div>

        <div className={styles.field}>
          <label htmlFor="code" className={styles.label}>
            Component Code <span className={styles.required}>*</span>
          </label>
          <textarea
            id="code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className={styles.codeInput}
            placeholder="Paste your component HTML/JSX here..."
            rows={12}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="description" className={styles.label}>Description (optional)</label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={styles.input}
            placeholder='e.g., "Accordion with three sections"'
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="css" className={styles.label}>CSS (optional)</label>
          <textarea
            id="css"
            value={css}
            onChange={(e) => setCss(e.target.value)}
            className={styles.codeInput}
            placeholder="Associated CSS styles..."
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="js" className={styles.label}>JavaScript (optional)</label>
          <textarea
            id="js"
            value={js}
            onChange={(e) => setJs(e.target.value)}
            className={styles.codeInput}
            placeholder="Associated JavaScript..."
            rows={4}
          />
        </div>

        <button
          type="submit"
          disabled={!code.trim() || appState === 'submitting' || appState === 'analyzing'}
          className={styles.submitButton}
        >
          {appState === 'submitting'
            ? 'Submitting...'
            : appState === 'analyzing'
              ? 'Analyzing...'
              : 'Analyze Component'}
        </button>
      </form>

      <div className={styles.resultsPanel}>
        <h2 className={styles.panelTitle}>Results</h2>

        {appState === 'idle' && (
          <p className={styles.placeholder}>
            Submit a component to see accessibility testing results.
          </p>
        )}

        {appState === 'analyzing' && progress && (
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

        {appState === 'complete' && results?.status === 'success' && results.analysis && (
          <div className={styles.results}>
            {/* Results display — implemented in 022-results-panel.md */}
            <pre className={styles.jsonOutput}>
              {JSON.stringify(results.analysis, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
