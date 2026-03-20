import type { ManualTest } from '../../types/api';
import styles from './ManualTestCard.module.css';

interface ManualTestCardProps {
  test: ManualTest;
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critical',
  serious: 'Serious',
  moderate: 'Moderate',
  minor: 'Minor',
};

export function ManualTestCard({ test }: ManualTestCardProps) {
  return (
    <article className={styles.card} aria-label={test.title}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <span className={`${styles.priority} ${styles[test.priority]}`}>
            {PRIORITY_LABELS[test.priority] || test.priority}
          </span>
          <h3 className={styles.title}>{test.title}</h3>
        </div>
        <div className={styles.criteria}>
          {test.wcagCriteria.map((criterion) => (
            <span key={criterion} className={styles.criterion}>
              {criterion}
            </span>
          ))}
        </div>
      </header>

      <ol className={styles.steps}>
        {test.steps.map((step, index) => (
          <li key={index} className={styles.step}>
            <div className={styles.stepAction}>
              <strong>Do:</strong> {step.action}
            </div>
            <div className={styles.stepExpected}>
              <strong>Expect:</strong> {step.expected}
            </div>
            <div className={styles.stepIfFail}>
              <strong>If not:</strong> {step.ifFail}
            </div>
          </li>
        ))}
      </ol>

      {test.sources.length > 0 && (
        <footer className={styles.sources}>
          <strong>Sources:</strong>
          <ul className={styles.sourceList}>
            {test.sources.map((source, i) => {
              const urlMatch = source.match(/(https?:\/\/[^\s.,;:)\]'"]+)/);
              return (
                <li key={i}>
                  {urlMatch ? (
                    <a
                      href={urlMatch[1]}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.sourceLink}
                    >
                      {source.replace(urlMatch[1], '').trim() || urlMatch[1]}
                    </a>
                  ) : (
                    source
                  )}
                </li>
              );
            })}
          </ul>
        </footer>
      )}
    </article>
  );
}
