import { useCallback, useState } from 'react';
import { ClassicWorkspace } from '../pages/ClassicWorkspace';
import { OneInputWorkspace } from '../pages/OneInputWorkspace';
import styles from './AppShell.module.css';

type MainTab = 'overview' | 'oneInput';

const TABS: { id: MainTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'oneInput', label: 'One input' },
];

export function AppShell() {
  const [tab, setTab] = useState<MainTab>('overview');

  const onTabKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      const i = TABS.findIndex((t) => t.id === tab);
      const next =
        e.key === 'ArrowRight'
          ? TABS[(i + 1) % TABS.length]!.id
          : TABS[(i - 1 + TABS.length) % TABS.length]!.id;
      setTab(next);
    },
    [tab],
  );

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

      <nav className={styles.tabBar} aria-label="Primary">
        <div
          role="tablist"
          className={styles.tabList}
          onKeyDown={onTabKeyDown}
        >
          {TABS.map((t) => (
            <div key={t.id} className={styles.tab} role="none">
              <button
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                className={styles.tabButton}
                aria-selected={tab === t.id}
                aria-controls={`panel-${t.id}`}
                tabIndex={tab === t.id ? 0 : -1}
                onClick={() => setTab(t.id)}
              >
                {t.label}
              </button>
            </div>
          ))}
        </div>
      </nav>

      <div className={styles.panels}>
        <section
          id="panel-overview"
          role="tabpanel"
          aria-labelledby="tab-overview"
          hidden={tab !== 'overview'}
          className={styles.tabPanel}
        >
          <ClassicWorkspace />
        </section>

        <section
          id="panel-oneInput"
          role="tabpanel"
          aria-labelledby="tab-oneInput"
          hidden={tab !== 'oneInput'}
          className={styles.tabPanel}
        >
          <OneInputWorkspace />
        </section>
      </div>
    </div>
  );
}
