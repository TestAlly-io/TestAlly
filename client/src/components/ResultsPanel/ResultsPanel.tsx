import type { AnalysisResult } from '../../types/api';
import { ManualTestCard } from '../ManualTestCard';
import styles from './ResultsPanel.module.css';

interface ResultsPanelProps {
  result: AnalysisResult;
}

export function ResultsPanel({ result }: ResultsPanelProps) {
  const { component, automatedResults, manualTests, allClear, summary } = result;

  return (
    <div className={styles.panel}>
      {/* Summary header */}
      <div className={styles.summary}>
        <div className={styles.componentInfo}>
          <span className={styles.componentType}>{component.type}</span>
          <span className={styles.confidence}>
            Confidence: {component.confidence}%
          </span>
        </div>
        <p className={styles.summaryText}>{summary}</p>
      </div>

      {/* All clear message */}
      {allClear && (
        <div className={styles.allClear} role="status">
          All automated checks passed. No manual testing required for this component.
        </div>
      )}

      {/* Automated results summary */}
      {(automatedResults.axeViolations.length > 0 ||
        automatedResults.eslintMessages.length > 0 ||
        automatedResults.customRuleFlags.length > 0) && (
        <details className={styles.automated}>
          <summary className={styles.automatedSummary}>
            Automated Findings (
            {automatedResults.axeViolations.length +
              automatedResults.eslintMessages.length +
              automatedResults.customRuleFlags.length}
            )
          </summary>

          {automatedResults.axeViolations.length > 0 && (
            <div className={styles.findingGroup}>
              <h4>axe-core Violations ({automatedResults.axeViolations.length})</h4>
              <ul>
                {automatedResults.axeViolations.map((v) => (
                  <li key={v.id} className={styles.finding}>
                    <span className={styles.findingImpact}>{v.impact}</span>
                    {v.description}
                    {v.helpUrl && (
                      <>
                        {' — '}
                        <a href={v.helpUrl} target="_blank" rel="noopener noreferrer">
                          Learn more
                        </a>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {automatedResults.eslintMessages.length > 0 && (
            <div className={styles.findingGroup}>
              <h4>ESLint Messages ({automatedResults.eslintMessages.length})</h4>
              <ul>
                {automatedResults.eslintMessages.map((m, i) => (
                  <li key={i} className={styles.finding}>
                    <span className={styles.findingImpact}>
                      {m.severity === 2 ? 'error' : 'warn'}
                    </span>
                    {m.message}
                    {' '}
                    <em>({m.ruleId} — line {m.line}:{m.column})</em>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {automatedResults.customRuleFlags.length > 0 && (
            <div className={styles.findingGroup}>
              <h4>Custom Rule Flags ({automatedResults.customRuleFlags.length})</h4>
              <ul>
                {automatedResults.customRuleFlags.map((f) => (
                  <li key={f.ruleId} className={styles.finding}>
                    <strong>{f.ruleName}:</strong> {f.message}
                    <br />
                    <em>Fix: {f.fixGuidance}</em>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </details>
      )}

      {/* Manual tests */}
      {manualTests.length > 0 && (
        <section className={styles.manualTests} aria-label="Manual testing walkthrough">
          <h3 className={styles.sectionTitle}>
            Manual Tests ({manualTests.length})
          </h3>
          {manualTests.map((test) => (
            <ManualTestCard key={test.id} test={test} />
          ))}
        </section>
      )}

      {/* Screen reader guides — shown when walkthrough includes AT test steps */}
      {result.resources?.screenReaderGuides && result.resources.screenReaderGuides.length > 0 && (
        <section className={styles.resources} aria-label="Assistive technology guides">
          <h3 className={styles.sectionTitle}>
            New to Screen Readers?
          </h3>
          <p className={styles.resourcesIntro}>
            Some tests above involve screen reader testing. Here are getting-started guides:
          </p>
          <ul className={styles.guideList}>
            {result.resources.screenReaderGuides.map((guide) => (
              <li key={`${guide.tool}-${guide.platform}`} className={styles.guideItem}>
                <a
                  href={guide.guideUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.guideLink}
                >
                  {guide.label}
                </a>
                <span className={styles.guidePlatform}>{guide.platform}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
