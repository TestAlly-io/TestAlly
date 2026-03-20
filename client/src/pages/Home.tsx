import { useState, useActionState } from 'react';
import { submitAnalysis, pollJobStatus, getManualTestResults } from '../api';
import type { AnalyzeRequest, JobStatus, ManualTestResponse } from '../types/api';
import { ResultsPanel } from '../components/ResultsPanel';
import styles from './Home.module.css';

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

export function Home() {
  const [progress, setProgress] = useState<JobStatus | null>(null);

  const [state, dispatch, isPending] = useActionState(
    async (_prevState: ActionState, formData: FormData): Promise<ActionState> => {
      const code = (formData.get('code') as string)?.trim();
      if (!code) return { status: 'error', message: 'Component code is required' };

      setProgress(null);

      try {
        const response = await submitAnalysis({
          code,
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
          <label htmlFor="language" className={styles.label}>Language</label>
          <select id="language" name="language" defaultValue="html" className={styles.select}>
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
            name="code"
            required
            className={styles.codeInput}
            placeholder="Paste your component HTML/JSX here..."
            rows={12}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="description" className={styles.label}>Description (optional)</label>
          <input
            id="description"
            name="description"
            type="text"
            className={styles.input}
            placeholder='e.g., "Accordion with three sections"'
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="css" className={styles.label}>CSS (optional)</label>
          <textarea
            id="css"
            name="css"
            className={styles.codeInput}
            placeholder="Associated CSS styles..."
            rows={4}
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="js" className={styles.label}>JavaScript (optional)</label>
          <textarea
            id="js"
            name="js"
            className={styles.codeInput}
            placeholder="Associated JavaScript..."
            rows={4}
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

        {state.status === 'complete' && state.results.status === 'success' && state.results.analysis && (
          <div className={styles.results}>
            <ResultsPanel result={state.results.analysis} />
          </div>
        )}
      </div>
    </div>
  );
}
