import { Routes, Route } from 'react-router';
import { Home } from './pages/Home';
import styles from './App.module.css';

export function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>TestAlly</h1>
        <p className={styles.subtitle}>AI-Powered Accessibility Testing Assistant</p>
      </header>
      <main className={styles.main}>
        <Routes>
          <Route path="/" element={<Home />} />
        </Routes>
      </main>
    </div>
  );
}
