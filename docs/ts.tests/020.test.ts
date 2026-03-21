/**
 * Test suite for 020-frontend-shell.md
 * Verifies that all instructions from the frontend shell planning document were followed correctly
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

const ROOT_DIR = process.cwd();
const CLIENT_SRC_DIR = join(ROOT_DIR, 'client', 'src');
const CLIENT_PAGES_DIR = join(CLIENT_SRC_DIR, 'pages');

describe('020-frontend-shell.md - Frontend Shell', () => {
  describe('API Client (client/src/api.ts)', () => {
    let content: string;

    it('should have api.ts file', () => {
      const filePath = join(CLIENT_SRC_DIR, 'api.ts');
      expect(existsSync(filePath), 'client/src/api.ts should exist').toBe(true);
      content = readFileSync(filePath, 'utf-8');
    });

    it('should import types from types/api', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/import.*AnalyzeRequest.*from.*types\/api/);
      expect(content).toMatch(/import.*AnalyzeResponse.*from.*types\/api/);
      expect(content).toMatch(/import.*JobStatus.*from.*types\/api/);
      expect(content).toMatch(/import.*ManualTestResponse.*from.*types\/api/);
    });

    it('should define API_BASE constant', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/API_BASE.*=.*['"]\/api['"]/);
    });

    it('should have request helper function', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/async function request/);
      expect(content).toContain('fetch(');
      expect(content).toContain('Content-Type');
      expect(content).toContain('application/json');
    });

    it('should export submitAnalysis function', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export async function submitAnalysis/);
      expect(content).toMatch(/AnalyzeRequest/);
      expect(content).toMatch(/AnalyzeResponse/);
      expect(content).toContain("'/analyze'");
      expect(content).toContain('POST');
    });

    it('should export getJobStatus function', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export async function getJobStatus/);
      expect(content).toContain('jobId');
      expect(content).toMatch(/\/status\/\${jobId}/);
    });

    it('should export getManualTestResults function', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export async function getManualTestResults/);
      expect(content).toContain('jobId');
      expect(content).toMatch(/\/manual-test\/\${jobId}/);
    });

    it('should export pollJobStatus function', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'api.ts'), 'utf-8');
      expect(content).toMatch(/export async function pollJobStatus/);
      expect(content).toContain('onProgress');
      expect(content).toContain('intervalMs');
      expect(content).toMatch(/status === ['"]completed['"]/);
      expect(content).toMatch(/status === ['"]failed['"]/);
      expect(content).toContain('setTimeout');
    });
  });

  describe('App Component with Routing', () => {
    it('should have updated main.tsx with BrowserRouter', () => {
      const filePath = join(CLIENT_SRC_DIR, 'main.tsx');
      expect(existsSync(filePath), 'client/src/main.tsx should exist').toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toMatch(/import.*BrowserRouter.*from ['"]react-router['"]/);
      expect(content).toContain('<BrowserRouter>');
      expect(content).toContain('</BrowserRouter>');
      expect(content).toMatch(/import.*App.*from/);
      expect(content).toContain('<App />');
    });

    it('should import index.css in main.tsx', () => {
      const content = readFileSync(join(CLIENT_SRC_DIR, 'main.tsx'), 'utf-8');
      expect(content).toMatch(/import ['"].\/index\.css['"]/);
    });

    it('should have App.tsx file', () => {
      const filePath = join(CLIENT_SRC_DIR, 'App.tsx');
      expect(existsSync(filePath), 'client/src/App.tsx should exist').toBe(true);
    });

    it('should import Routes and Route from react-router', () => {
      const content = readFileSync(join(CLIENT_SRC_DIR, 'App.tsx'), 'utf-8');
      expect(content).toMatch(/import.*Routes.*Route.*from ['"]react-router['"]/);
    });

    it('should import Home component', () => {
      const content = readFileSync(join(CLIENT_SRC_DIR, 'App.tsx'), 'utf-8');
      expect(content).toMatch(/import.*Home.*from ['"]\.\/pages\/Home['"]/);
    });

    it('should import App.module.css', () => {
      const content = readFileSync(join(CLIENT_SRC_DIR, 'App.tsx'), 'utf-8');
      expect(content).toMatch(/import.*styles.*from ['"]\.\/App\.module\.css['"]/);
    });

    it('should export App function', () => {
      const content = readFileSync(join(CLIENT_SRC_DIR, 'App.tsx'), 'utf-8');
      expect(content).toMatch(/export function App/);
    });

    it('should have header with title and subtitle', () => {
      const content = readFileSync(join(CLIENT_SRC_DIR, 'App.tsx'), 'utf-8');
      expect(content).toContain('<header');
      expect(content).toContain('TestAlly');
      expect(content).toContain('AI-Powered Accessibility Testing Assistant');
    });

    it('should have Routes with Home route', () => {
      const content = readFileSync(join(CLIENT_SRC_DIR, 'App.tsx'), 'utf-8');
      expect(content).toContain('<Routes>');
      expect(content).toMatch(/<Route path=['"]\/['"].*Home/);
    });
  });

  describe('App.module.css', () => {
    let content: string;

    it('should have App.module.css file', () => {
      const filePath = join(CLIENT_SRC_DIR, 'App.module.css');
      expect(existsSync(filePath), 'client/src/App.module.css should exist').toBe(true);
      content = readFileSync(filePath, 'utf-8');
    });

    it('should have .app class with flex layout', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'App.module.css'), 'utf-8');
      expect(content).toContain('.app');
      expect(content).toContain('display: flex');
      expect(content).toContain('flex-direction: column');
      expect(content).toContain('min-height: 100vh');
    });

    it('should have .header class', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'App.module.css'), 'utf-8');
      expect(content).toContain('.header');
      expect(content).toMatch(/background.*#1a1a2e/);
    });

    it('should have .title class', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'App.module.css'), 'utf-8');
      expect(content).toContain('.title');
    });

    it('should have .subtitle class', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'App.module.css'), 'utf-8');
      expect(content).toContain('.subtitle');
    });

    it('should have .main class', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'App.module.css'), 'utf-8');
      expect(content).toContain('.main');
      expect(content).toContain('flex: 1');
    });
  });

  describe('Home Page Component', () => {
    let content: string;

    it('should have Home.tsx file', () => {
      const filePath = join(CLIENT_PAGES_DIR, 'Home.tsx');
      expect(existsSync(filePath), 'client/src/pages/Home.tsx should exist').toBe(true);
      content = readFileSync(filePath, 'utf-8');
    });

    it('should import React hooks', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/import.*useState.*useCallback.*from ['"]react['"]/);
    });

    it('should import API functions', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toContain('submitAnalysis');
      expect(content).toContain('pollJobStatus');
      expect(content).toContain('getManualTestResults');
      expect(content).toMatch(/from ['"]\.\.\/api['"]/);
    });

    it('should import types from types/api', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/import.*from ['"]\.\.\/types\/api['"]/);
    });

    it('should import Home.module.css', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/import.*styles.*from ['"]\.\/Home\.module\.css['"]/);
    });

    it('should define AppState type', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/type AppState/);
      expect(content).toContain('idle');
      expect(content).toContain('submitting');
      expect(content).toContain('analyzing');
      expect(content).toContain('complete');
      expect(content).toContain('error');
    });

    it('should export Home function', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/export function Home/);
    });

    it('should have state for form fields', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/useState.*code/);
      expect(content).toMatch(/useState.*language/);
      expect(content).toMatch(/useState.*description/);
      expect(content).toMatch(/useState.*css/);
      expect(content).toMatch(/useState.*js/);
    });

    it('should have state for app state and results', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/useState.*appState/);
      expect(content).toMatch(/useState.*progress/);
      expect(content).toMatch(/useState.*results/);
      expect(content).toMatch(/useState.*error/);
    });

    it('should have handleSubmit callback', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toContain('handleSubmit');
      expect(content).toContain('useCallback');
      expect(content).toContain('submitAnalysis');
      expect(content).toContain('pollJobStatus');
      expect(content).toContain('getManualTestResults');
    });

    it('should have two-pane layout structure', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toContain('inputPanel');
      expect(content).toContain('resultsPanel');
      expect(content).toContain('Component Input');
      expect(content).toContain('Results');
    });

    it('should have language select field', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/<select/);
      expect(content).toContain('language');
      expect(content).toContain('<option value="html">HTML</option>');
      expect(content).toContain('<option value="jsx">JSX</option>');
      expect(content).toContain('<option value="tsx">TSX</option>');
      expect(content).toContain('<option value="vue">Vue</option>');
      expect(content).toContain('<option value="svelte">Svelte</option>');
    });

    it('should have code textarea field', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/<textarea.*id=['"]code['"]/);
      expect(content).toContain('Component Code');
      expect(content).toContain('required');
    });

    it('should have optional description field', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/<input.*id=['"]description['"]/);
      expect(content).toContain('Description');
      expect(content).toContain('optional');
    });

    it('should have optional css textarea field', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/<textarea.*id=['"]css['"]/);
      expect(content).toContain('CSS');
    });

    it('should have optional js textarea field', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/<textarea.*id=['"]js['"]/);
      expect(content).toContain('JavaScript');
    });

    it('should have submit button with state-dependent text', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toContain('<button');
      expect(content).toContain('onClick={handleSubmit}');
      expect(content).toContain('disabled=');
      expect(content).toContain('Submitting...');
      expect(content).toContain('Analyzing...');
      expect(content).toContain('Analyze Component');
    });

    it('should have idle state placeholder', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/appState === ['"]idle['"]/);
      expect(content).toContain('Submit a component');
    });

    it('should have analyzing state with progress display', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/appState === ['"]analyzing['"]/);
      expect(content).toContain('progress');
      expect(content).toContain('progress.phase');
      expect(content).toContain('progress.description');
      expect(content).toContain('progressBar');
      expect(content).toContain('phaseIndex');
      expect(content).toContain('totalPhases');
    });

    it('should have error state display', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/appState === ['"]error['"]/);
      expect(content).toContain('role="alert"');
      expect(content).toContain('Error:');
    });

    it('should have complete state with results display', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.tsx'), 'utf-8');
      expect(content).toMatch(/appState === ['"]complete['"]/);
      expect(content).toMatch(/results\?\.status === ['"]success['"]/);
      expect(content).toContain('results.analysis');
    });
  });

  describe('Home.module.css', () => {
    let content: string;

    it('should have Home.module.css file', () => {
      const filePath = join(CLIENT_PAGES_DIR, 'Home.module.css');
      expect(existsSync(filePath), 'client/src/pages/Home.module.css should exist').toBe(true);
      content = readFileSync(filePath, 'utf-8');
    });

    it('should have .container class with grid layout', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.module.css'), 'utf-8');
      expect(content).toContain('.container');
      expect(content).toContain('display: grid');
      expect(content).toContain('grid-template-columns: 1fr 1fr');
    });

    it('should have .inputPanel and .resultsPanel classes', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.module.css'), 'utf-8');
      expect(content).toContain('.inputPanel');
      expect(content).toContain('.resultsPanel');
      expect(content).toContain('background: #fff');
      expect(content).toContain('border-radius');
    });

    it('should have .panelTitle class', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.module.css'), 'utf-8');
      expect(content).toContain('.panelTitle');
    });

    it('should have form field classes', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.module.css'), 'utf-8');
      expect(content).toContain('.field');
      expect(content).toContain('.label');
      expect(content).toContain('.required');
      expect(content).toContain('.input');
      expect(content).toContain('.select');
      expect(content).toContain('.codeInput');
    });

    it('should have .submitButton class', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.module.css'), 'utf-8');
      expect(content).toContain('.submitButton');
      expect(content).toContain('width: 100%');
      expect(content).toMatch(/background.*#4361ee/);
      expect(content).toContain('cursor: pointer');
    });

    it('should have button hover and disabled states', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.module.css'), 'utf-8');
      expect(content).toMatch(/\.submitButton:hover:not\(:disabled\)/);
      expect(content).toMatch(/\.submitButton:disabled/);
    });

    it('should have .placeholder class', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.module.css'), 'utf-8');
      expect(content).toContain('.placeholder');
    });

    it('should have progress classes', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.module.css'), 'utf-8');
      expect(content).toContain('.progress');
      expect(content).toContain('.progressPhase');
      expect(content).toContain('.progressBar');
      expect(content).toContain('.progressFill');
    });

    it('should have .error class', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.module.css'), 'utf-8');
      expect(content).toContain('.error');
    });

    it('should have .results and .jsonOutput classes', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.module.css'), 'utf-8');
      expect(content).toContain('.results');
      expect(content).toContain('.jsonOutput');
    });

    it('should have responsive media query', () => {
      content = readFileSync(join(CLIENT_PAGES_DIR, 'Home.module.css'), 'utf-8');
      expect(content).toMatch(/@media.*max-width.*900px/);
      expect(content).toContain('grid-template-columns: 1fr');
    });
  });

  describe('Global CSS Reset (index.css)', () => {
    let content: string;

    it('should have index.css file', () => {
      const filePath = join(CLIENT_SRC_DIR, 'index.css');
      expect(existsSync(filePath), 'client/src/index.css should exist').toBe(true);
      content = readFileSync(filePath, 'utf-8');
    });

    it('should have box-sizing reset', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'index.css'), 'utf-8');
      expect(content).toContain('box-sizing: border-box');
      expect(content).toMatch(/\*.*::before.*::after/);
    });

    it('should have body styles', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'index.css'), 'utf-8');
      expect(content).toContain('body');
      expect(content).toContain('margin: 0');
      expect(content).toContain('padding: 0');
    });

    it('should have font smoothing', () => {
      content = readFileSync(join(CLIENT_SRC_DIR, 'index.css'), 'utf-8');
      expect(content).toContain('-webkit-font-smoothing');
      expect(content).toContain('-moz-osx-font-smoothing');
    });
  });
});
