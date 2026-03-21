import { describe, it, expect } from 'vitest';
import { runEslintAnalysis } from '../eslint-runner.js';

describe('runEslintAnalysis', () => {
  it('returns no messages for accessible JSX', async () => {
    const code = `
      function App() {
        return <button type="button">Click me</button>;
      }
    `;

    const messages = await runEslintAnalysis(code, 'jsx');
    expect(messages).toEqual([]);
  });

  it('detects missing alt text in JSX', async () => {
    const code = `
      function App() {
        return <img src="photo.jpg" />;
      }
    `;

    const messages = await runEslintAnalysis(code, 'jsx');
    const altMsg = messages.find((m) => m.ruleId === 'jsx-a11y/alt-text');
    expect(altMsg).toBeDefined();
    expect(altMsg!.severity).toBe(2);
  });

  it('detects click handler without key events', async () => {
    const code = `
      function App() {
        return <div onClick={() => {}} role="button">Click</div>;
      }
    `;

    const messages = await runEslintAnalysis(code, 'jsx');
    const clickMsg = messages.find(
      (m) => m.ruleId === 'jsx-a11y/click-events-have-key-events',
    );
    expect(clickMsg).toBeDefined();
  });

  it('returns no messages for accessible TSX with type annotations', async () => {
    const code = `
      interface Props {
        label: string;
      }
      function App({ label }: Props) {
        return <button type="button">{label}</button>;
      }
    `;

    const messages = await runEslintAnalysis(code, 'tsx');
    expect(messages).toEqual([]);
  });

  it('detects missing alt text in TSX', async () => {
    const code = `
      type ImageProps = { src: string };
      function Avatar({ src }: ImageProps) {
        return <img src={src} />;
      }
    `;

    const messages = await runEslintAnalysis(code, 'tsx');
    const altMsg = messages.find((m) => m.ruleId === 'jsx-a11y/alt-text');
    expect(altMsg).toBeDefined();
    expect(altMsg!.severity).toBe(2);
  });

  it('handles HTML input by wrapping as JSX', async () => {
    const html = '<img src="photo.jpg">';

    const messages = await runEslintAnalysis(html, 'html');
    // Should still detect a11y issues
    expect(messages.length).toBeGreaterThan(0);
  });

  it('returns correct line numbers for HTML input', async () => {
    const html = '<img src="photo.jpg">';

    const messages = await runEslintAnalysis(html, 'html');
    // Line should be 1 (adjusted from the wrapper offset)
    expect(messages[0]?.line).toBe(1);
  });
});
