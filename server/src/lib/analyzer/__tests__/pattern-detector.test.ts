import { describe, it, expect } from 'vitest';
import { detectPattern } from '../pattern-detector.js';

describe('detectPattern', () => {
  it('detects accordion from aria-expanded', () => {
    const html = `
      <div class="accordion">
        <button aria-expanded="false">Section 1</button>
        <div class="panel">Content 1</div>
      </div>
    `;
    const result = detectPattern(html, 'accordion component');
    expect(result.patternType).toBe('accordion');
    expect(result.confidence).toBeGreaterThan(30);
  });

  it('detects tabs from ARIA roles', () => {
    const html = `
      <div role="tablist">
        <button role="tab" aria-selected="true">Tab 1</button>
        <button role="tab">Tab 2</button>
      </div>
      <div role="tabpanel">Content</div>
    `;
    const result = detectPattern(html);
    expect(result.patternType).toBe('tabs');
    expect(result.confidence).toBeGreaterThan(50);
  });

  it('detects modal from role="dialog" and aria-modal', () => {
    const html = '<div role="dialog" aria-modal="true"><h2>Title</h2></div>';
    const result = detectPattern(html);
    expect(result.patternType).toBe('modal');
  });

  it('detects navigation from <nav> element', () => {
    const html = '<nav><ul><li><a href="/">Home</a></li></ul></nav>';
    const result = detectPattern(html);
    expect(result.patternType).toBe('navigation');
  });

  it('uses description as fallback', () => {
    const html = '<div><div>content</div></div>';
    const result = detectPattern(html, 'carousel slider');
    expect(result.patternType).toBe('carousel');
  });

  it('returns unknown for unrecognizable input', () => {
    const html = '<div><span>Hello world</span></div>';
    const result = detectPattern(html);
    expect(result.patternType).toBe('unknown');
    expect(result.confidence).toBeLessThan(20);
  });

  it('uses CSS class name hints', () => {
    const html = '<div class="tooltip-container"><span class="tooltip-text">Hint</span></div>';
    const result = detectPattern(html);
    expect(result.patternType).toBe('tooltip');
  });

  it('detects form from <form> element', () => {
    const html = '<form><input type="text" /><button type="submit">Submit</button></form>';
    const result = detectPattern(html);
    expect(result.patternType).toBe('form');
  });

  it('detects table from <table> element', () => {
    const html = '<table><thead><tr><th>Name</th></tr></thead><tbody><tr><td>Alice</td></tr></tbody></table>';
    const result = detectPattern(html);
    expect(result.patternType).toBe('table');
  });

  it('detects dropdown from aria-haspopup', () => {
    const html = '<button aria-haspopup="listbox" aria-expanded="false">Choose</button>';
    const result = detectPattern(html);
    expect(result.patternType).toBe('dropdown');
  });

  it('detects menu from role="menu"', () => {
    const html = `
      <div role="menu">
        <div role="menuitem">Cut</div>
        <div role="menuitem">Copy</div>
      </div>
    `;
    const result = detectPattern(html);
    expect(result.patternType).toBe('menu');
  });

  it('detects toggle from role="switch"', () => {
    const html = '<button role="switch" aria-checked="false">Dark mode</button>';
    const result = detectPattern(html);
    expect(result.patternType).toBe('toggle');
  });

  it('detects tree from role="tree"', () => {
    const html = `
      <ul role="tree">
        <li role="treeitem">Item 1</li>
        <li role="treeitem">Item 2</li>
      </ul>
    `;
    const result = detectPattern(html);
    expect(result.patternType).toBe('tree');
  });

  it('detects alert from role="alert"', () => {
    const html = '<div role="alert">Something went wrong</div>';
    const result = detectPattern(html);
    expect(result.patternType).toBe('alert');
  });

  it('caps confidence at 95', () => {
    // Tabs with multiple strong signals: role=tablist + role=tab + aria-selected + description
    const html = `
      <div role="tablist">
        <button role="tab" aria-selected="true">Tab 1</button>
      </div>
      <div role="tabpanel">Content</div>
    `;
    const result = detectPattern(html, 'tabs component');
    expect(result.confidence).toBeLessThanOrEqual(95);
  });

  it('populates signals array with detection reasons', () => {
    const html = '<nav><a href="/">Home</a></nav>';
    const result = detectPattern(html);
    expect(result.signals.length).toBeGreaterThan(0);
    expect(result.signals.some((s: string) => s.includes('nav'))).toBe(true);
  });
});
