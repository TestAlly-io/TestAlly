/**
 * Manual end-to-end smoke test for the analysis pipeline.
 *
 * Uses the Dyslexia toggle switch from Universal-Access/browser-extension
 * (https://github.com/Universal-Access/browser-extension) as the test fixture.
 *
 * Usage:  npm run test:smoke
 *    or:  npx tsx server/src/_e2e-smoke.ts
 */
import { createApp } from './app.js';
import http from 'http';

// ---------------------------------------------------------------------------
// Fixture: toggle switch from Universal-Access/browser-extension sidepanel
// ---------------------------------------------------------------------------

const CODE = `\
<div class="setting-row">
  <span class="setting-label">Dyslexia</span>
  <button role="switch" aria-checked="false" class="toggle-switch"
          id="toggle-dyslexia" aria-label="Toggle Dyslexia mode">
    <span class="toggle-knob"></span>
  </button>
</div>`;

const CSS = `\
.toggle-switch {
  position: relative;
  width: 48px;
  height: 28px;
  border: 2px solid var(--sp-border);
  border-radius: 14px;
  background: var(--sp-surface-active);
  cursor: pointer;
  padding: 0;
  flex-shrink: 0;
  transition: background 0.2s;
  outline: none;
}
.toggle-switch:hover {
  border-color: var(--sp-border-hover);
}
.toggle-knob {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--sp-text-hint);
  transition: transform 0.2s, background 0.2s;
}
.toggle-switch[aria-checked="true"] {
  background: var(--sp-primary);
  border-color: var(--sp-primary);
}
.toggle-switch[aria-checked="true"] .toggle-knob {
  transform: translateX(20px);
  background: var(--sp-primary-text);
}`;

const JS = `\
let dyslexiaEnabled = false;

function applyDyslexia(enabled) {
  dyslexiaEnabled = enabled;
  const toggle = document.getElementById('toggle-dyslexia');
  if (toggle) toggle.setAttribute('aria-checked', String(enabled));
  document.body.classList.toggle('sp-preset-dyslexia', enabled);
}

document.getElementById('toggle-dyslexia')?.addEventListener('click', () => {
  applyDyslexia(!dyslexiaEnabled);
});

document.getElementById('toggle-dyslexia')?.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'Enter') {
    e.preventDefault();
    applyDyslexia(!dyslexiaEnabled);
  }
});`;

// ---------------------------------------------------------------------------
// Test runner
// ---------------------------------------------------------------------------

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 90;

const app = createApp();
const server = http.createServer(app);

server.listen(0, async () => {
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  console.log('Server on port', port);

  const base = `http://localhost:${port}`;

  // POST /api/analyze
  const res = await fetch(`${base}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      code: CODE,
      language: 'html',
      description: 'Dyslexia toggle switch from Universal-Access browser extension sidepanel',
      css: CSS,
      js: JS,
    }),
  });

  const body = await res.json();
  console.log('POST /api/analyze:', res.status, JSON.stringify(body, null, 2));

  if (res.status !== 202) {
    console.log('FAILED: Expected 202');
    server.close();
    process.exit(1);
  }

  const jobId = body.jobId;

  // Poll status
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const statusRes = await fetch(`${base}/api/status/${jobId}`);
    const statusBody = await statusRes.json();
    console.log(`Poll ${i}:`, JSON.stringify(statusBody));

    if (statusBody.status === 'completed') {
      const resultRes = await fetch(`${base}/api/manual-test/${jobId}`);
      const resultBody = await resultRes.json();
      console.log('GET /api/manual-test:', resultRes.status);
      console.log('Result:', JSON.stringify(resultBody, null, 2).slice(0, 4000));
      server.close();
      process.exit(0);
    }

    if (statusBody.status === 'failed') {
      console.log('JOB FAILED:', JSON.stringify(statusBody));
      server.close();
      process.exit(1);
    }
  }

  console.log('TIMEOUT');
  server.close();
  process.exit(1);
});
