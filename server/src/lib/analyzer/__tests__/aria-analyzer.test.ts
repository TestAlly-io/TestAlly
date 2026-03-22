import { describe, it, expect } from 'vitest';
import { analyzeAria } from '../aria-analyzer.js';

describe('analyzeAria', () => {
  it('detects roles in HTML', async () => {
    const html = '<div role="tablist"><button role="tab">Tab 1</button></div>';
    const result = await analyzeAria(html);
    expect(result.roles).toContain('tablist');
    expect(result.roles).toContain('tab');

    // Finds record with role that has no concerns
    const tablistFinding = result.findings.find(f => f.role === 'tablist');
    expect(tablistFinding).toBeDefined();
    expect(tablistFinding?.element).toContain('<div role="tablist">');
  });

  it('flags missing required attributes', async () => {
    const html = '<div role="checkbox">Toggle</div>';
    const result = await analyzeAria(html);
    const concern = result.findings.find((f) => f.concern?.includes('aria-checked'));
    expect(concern).toBeDefined();
    expect(concern?.element).toContain('<div role="checkbox">');
  });

  it('does not flag when required attributes are present', async () => {
    const html = '<div role="checkbox" aria-checked="false">Toggle</div>';
    const result = await analyzeAria(html);
    const concern = result.findings.find((f) => f.concern?.includes('must have'));
    expect(concern).toBeUndefined();
  });

  it('flags redundant roles', async () => {
    const html = '<button role="button">Click</button>';
    const result = await analyzeAria(html);
    const redundant = result.findings.find((f) => f.concern?.toLowerCase().includes('redundant'));
    expect(redundant).toBeDefined();
  });

  it('flags aria-hidden on focusable elements', async () => {
    const html = '<button aria-hidden="true">Hidden button</button>';
    const result = await analyzeAria(html);
    const concern = result.findings.find((f) => f.concern?.includes('aria-hidden'));
    expect(concern).toBeDefined();
  });

  it('counts ARIA attributes', async () => {
    const html = '<div role="dialog" aria-modal="true" aria-labelledby="title">Content</div>';
    const result = await analyzeAria(html);
    expect(result.ariaAttributeCount).toBe(2); // aria-modal, aria-labelledby
  });

  it('handles HTML with no ARIA usage', async () => {
    const html = '<p>Just a paragraph</p>';
    const result = await analyzeAria(html);
    expect(result.roles).toHaveLength(0);
    expect(result.ariaAttributeCount).toBe(0);
    expect(result.findings).toHaveLength(0);
  });

  it('does not include non-ARIA issues like missing alt text', async () => {
    // <img> without alt triggers `jsx-a11y/alt-text`, which shouldn't be included as an AriaFinding
    const html = '<img src="image.jpg" />';
    const result = await analyzeAria(html);
    const altTextConcern = result.findings.find(f => f.concern?.toLowerCase().includes('alt'));
    expect(altTextConcern).toBeUndefined();
    expect(result.findings).toHaveLength(0);
  });

  it('correctly maps findings in multiline HTML', async () => {
    const html = `
      <div>
        <h1>Welcome</h1>
        <div 
          role="dialog"
          aria-modal="true"
        >
          <span>Content</span>
        </div>
        <button role="button">
          Click me
        </button>
      </div>
    `;
    const result = await analyzeAria(html);

    // The button element is on line 10 of this template literal string
    const redundant = result.findings.find((f) => f.concern?.toLowerCase().includes('redundant'));
    expect(redundant).toBeDefined();
    expect(redundant?.line).toBe(10);

    // Check that aria attributes are counted correctly across multiple lines
    expect(result.ariaAttributeCount).toBe(1); // aria-modal="true"

    // Dialog should be identified as a non-concern role on line 4
    const dialog = result.findings.find((f) => f.role === 'dialog');
    expect(dialog).toBeDefined();
    expect(dialog?.line).toBe(4);
  });
});
