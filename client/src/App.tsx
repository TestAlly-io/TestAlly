import { Routes, Route } from 'react-router';
import { AppShell } from './layout/AppShell';
import styles from './App.module.css';

export function App() {
  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<AppShell />} />
        </Routes>
      </main>
    </div>
  );
}
