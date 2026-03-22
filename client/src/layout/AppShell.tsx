import { ClassicWorkspace } from '../pages/ClassicWorkspace';
import styles from './AppShell.module.css';

/**
 * Overview-only shell: "One input" and "Chat" tabs are hidden for this build.
 * Restore tab list + ChatWorkspace / OneInputWorkspace when re-enabling those flows.
 */
export function AppShell() {
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div className={styles.headerBrand}>
          <h1 className={styles.brandLockup}>
            <img src="/testally-logo.svg" alt="TestAlly" className={styles.logo} />
          </h1>
        </div>
        <p className={styles.tagline}>
          Accessibility testing assistant — paste a component, run analysis, review results.
        </p>
      </header>

      <main className={styles.panels}>
        <div className={styles.tabPanel}>
          <ClassicWorkspace />
        </div>
      </main>
    </div>
  );
}
