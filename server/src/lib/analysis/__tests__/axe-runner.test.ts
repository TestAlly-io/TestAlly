import { describe, expect, it } from 'vitest';

import { runAxeAnalysis } from '../axe-runner.js';

describe('runAxeAnalysis', () => {
  it('returns no violations for accessible HTML', async () => {
    const html =
      '<main><button type="button">Click me</button><a href="/about">About</a></main>';
    const result = await runAxeAnalysis(html);

    expect(result.violations).toEqual([]);
    expect(result.axeVersion).toBeDefined();
    expect(result.axeVersion.length).toBeGreaterThan(0);
  });

  it('detects missing alt text on images', async () => {
    const html = '<img src="photo.jpg">';
    const result = await runAxeAnalysis(html);

    const imageAlt = result.violations.find((v) => v.id === 'image-alt');
    expect(imageAlt).toBeDefined();
    expect(imageAlt?.impact).toBe('critical');
  });

  it('detects empty button', async () => {
    const html = '<button></button>';
    const result = await runAxeAnalysis(html);

    expect(result.violations.some((v) => v.id === 'button-name')).toBe(true);
  });

  it('handles a full HTML document as input', async () => {
    const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Test</title></head>
<body><p>Hello</p></body>
</html>`;
    const result = await runAxeAnalysis(html);

    expect(result.passes).toBeGreaterThan(0);
  });

  it('returns structured violation nodes', async () => {
    const html = '<img src="photo.jpg">';
    const result = await runAxeAnalysis(html);

    const first = result.violations[0];
    expect(first).toBeDefined();
    expect(first.nodes.length).toBeGreaterThan(0);
    expect(first.nodes[0].html).toContain('img');
    expect(first.nodes[0].target).toBeDefined();
    expect(Array.isArray(first.nodes[0].target)).toBe(true);
  });
});
