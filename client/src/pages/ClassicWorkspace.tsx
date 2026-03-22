import { useState, useActionState } from 'react';
import { submitAnalysis, pollJobStatus, getManualTestResults } from '../api';
import type { AnalyzeRequest, JobStatus, ManualTestResponse } from '../types/api';
import { ResultsPanel } from '../components/ResultsPanel';
import styles from './ClassicWorkspace.module.css';

type ActionState =
  | { status: 'idle' }
  | { status: 'complete'; results: ManualTestResponse }
  | { status: 'error'; message: string };

function SubmitButton({ isPending, progress }: { isPending: boolean; progress: JobStatus | null }) {
  return (
    <button type="submit" disabled={isPending} className={styles.submitButton}>
      {isPending
        ? progress
          ? 'Analyzing...'
          : 'Submitting...'
        : 'Analyze Component'}
    </button>
  );
}

/**
 * Multi-field component form (language, code, optional description/css/js) — matches the pre–single-field shell.
 */
export function ClassicWorkspace() {
  const [progress, setProgress] = useState<JobStatus | null>(null);
  const [language, setLanguage] = useState<AnalyzeRequest['language']>('html');
  const [code, setCode] = useState('');
  const [css, setCss] = useState('');
  const [js, setJs] = useState('');

  const [state, dispatch, isPending] = useActionState(
    async (_prevState: ActionState, formData: FormData): Promise<ActionState> => {
      const codeValue = (formData.get('code') as string)?.trim();
      if (!codeValue) return { status: 'error', message: 'Component code is required' };

      setProgress(null);

      try {
        const response = await submitAnalysis({
          code: codeValue,
          language: formData.get('language') as AnalyzeRequest['language'],
          description: (formData.get('description') as string) || undefined,
          css: (formData.get('css') as string) || undefined,
          js: (formData.get('js') as string) || undefined,
        });

        await pollJobStatus(response.jobId, (status) => {
          setProgress(status);
        });

        const results = await getManualTestResults(response.jobId);
        return { status: 'complete', results };
      } catch (err) {
        return { status: 'error', message: err instanceof Error ? err.message : 'An error occurred' };
      }
    },
    { status: 'idle' },
  );

  return (
    <div className={styles.container}>
      <form className={styles.inputPanel} action={dispatch}>
        <h2 className={styles.panelTitle}>Component Input</h2>

        <div className={styles.field}>
          <label htmlFor="classic-language" className={styles.label}>
            Language
          </label>
          <select
            id="classic-language"
            name="language"
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
          <label htmlFor="classic-code" className={styles.label}>
            Component Code <span className={styles.required} aria-hidden="true">*</span>
          </label>
          <textarea
            id="classic-code"
            name="code"
            className={styles.codeInput}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Paste your component HTML/JSX here..."
            required
            aria-required="true"
            spellCheck={false}
            style={{ minHeight: '280px' }}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="classic-description" className={styles.label}>
            Description (optional)
          </label>
          <input
            id="classic-description"
            name="description"
            type="text"
            className={styles.input}
            placeholder='e.g., "Accordion with three sections"'
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="classic-css" className={styles.label}>
            CSS (optional)
          </label>
          <textarea
            id="classic-css"
            name="css"
            className={styles.codeInput}
            value={css}
            onChange={(e) => setCss(e.target.value)}
            placeholder="Associated CSS styles..."
            spellCheck={false}
            style={{ minHeight: '120px' }}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="classic-js" className={styles.label}>
            JavaScript (optional)
          </label>
          <textarea
            id="classic-js"
            name="js"
            className={styles.codeInput}
            value={js}
            onChange={(e) => setJs(e.target.value)}
            placeholder="Associated JavaScript..."
            spellCheck={false}
            style={{ minHeight: '120px' }}
          />
        </div>

        <SubmitButton isPending={isPending} progress={progress} />
      </form>

      <div className={styles.resultsPanel}>
        <h2 className={styles.panelTitle}>Results</h2>

        {state.status === 'idle' && !isPending && (
          <p className={styles.placeholder}>
            Submit a component to see accessibility testing results.
          </p>
        )}

        {isPending && progress && (
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

        {state.status === 'error' && (
          <div className={styles.error} role="alert">
            <strong>Error:</strong> {state.message}
          </div>
        )}

        {state.status === 'complete' &&
          state.results.status === 'success' &&
          state.results.analysis && (
            <div className={styles.results}>
              <ResultsPanel result={state.results.analysis} />
            </div>
          )}
      </div>
    </div>
  );
}
