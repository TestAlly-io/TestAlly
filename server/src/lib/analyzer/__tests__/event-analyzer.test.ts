import { describe, it, expect } from 'vitest';
import { analyzeEvents } from '../event-analyzer.js';

describe('analyzeEvents', () => {
  it('detects onClick handlers', () => {
    const html = '<button onClick="handleClick()">Click</button>';
    const result = analyzeEvents(html);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('onClick');
  });

  it('detects lowercase HTML event attributes', () => {
    const html = '<div onclick="handler()">Click</div>';
    const result = analyzeEvents(html);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('onClick');
  });

  it('detects multiple events on one element', () => {
    const html = '<input onFocus="a()" onBlur="b()" onChange="c()" />';
    const result = analyzeEvents(html);
    expect(result.events).toHaveLength(3);
  });

  it('identifies keyboard gaps (onClick without onKeyDown)', () => {
    const html = '<div onClick="handle()">Clickable div</div>';
    const result = analyzeEvents(html);
    expect(result.keyboardGaps).toHaveLength(1);
    expect(result.keyboardGaps[0].mouseEvent).toBe('onClick');
  });

  it('no keyboard gap when onKeyDown is present', () => {
    const html = '<div onClick="handle()" onKeyDown="handleKey()">Click</div>';
    const result = analyzeEvents(html);
    expect(result.keyboardGaps).toHaveLength(0);
  });

  it('returns empty for HTML with no event handlers', () => {
    const html = '<p>Just text</p><a href="/about">Link</a>';
    const result = analyzeEvents(html);
    expect(result.events).toHaveLength(0);
    expect(result.keyboardGaps).toHaveLength(0);
  });

  it('handles multiple elements with handlers', () => {
    const html = `
      <button onClick="a()">A</button>
      <button onClick="b()">B</button>
      <div onMouseOver="c()">C</div>
    `;
    const result = analyzeEvents(html);
    expect(result.events).toHaveLength(3);
  });

  it('reports correct line numbers for single-line input', () => {
    const html = '<button onClick="go()">Go</button>';
    const result = analyzeEvents(html);
    expect(result.events[0].line).toBe(1);
  });

  it('reports correct line numbers for multi-line input', () => {
    const html = '<div>\n  <span>\n    <button onClick="go()">Go</button>\n  </span>\n</div>';
    const result = analyzeEvents(html);
    expect(result.events[0].line).toBe(3);
  });

  it('handles self-closing elements', () => {
    const html = '<img onclick="enlarge()" src="photo.jpg" />';
    const result = analyzeEvents(html);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('onClick');
    expect(result.events[0].element).toContain('<img');
  });

  it('includes element representation in detected events', () => {
    const html = '<a href="/page" onclick="track()">Link</a>';
    const result = analyzeEvents(html);
    expect(result.events[0].element).toContain('href="/page"');
    // Event attributes should be excluded from element representation
    expect(result.events[0].element).not.toContain('onclick');
  });

  it('includes element and line in keyboardGaps', () => {
    const html = '<div>\n  <span onClick="do()">act</span>\n</div>';
    const result = analyzeEvents(html);
    expect(result.keyboardGaps).toHaveLength(1);
    expect(result.keyboardGaps[0].element).toContain('<span>');
    expect(result.keyboardGaps[0].line).toBe(2);
  });

  it('flags onKeyPress-only elements as keyboard gaps (deprecated event)', () => {
    const html = '<div onClick="a()" onKeyPress="b()">Press</div>';
    const result = analyzeEvents(html);
    // onKeyPress is deprecated, so it should NOT satisfy keyboard support
    expect(result.keyboardGaps).toHaveLength(1);
  });

  it('handles nested elements independently', () => {
    const html = '<div onClick="outer()"><button onClick="inner()">Click</button></div>';
    const result = analyzeEvents(html);
    expect(result.events).toHaveLength(2);
    expect(result.keyboardGaps).toHaveLength(2);
  });

  it('escapes attribute values with quotes', () => {
    const html = '<div data-info="say &quot;hello&quot;" onclick="go()">X</div>';
    const result = analyzeEvents(html);
    expect(result.events[0].element).not.toContain('onclick');
    // Should not produce malformed element string
    expect(result.events[0].element).toMatch(/^<div .+>$/);
  });

  it('handles malformed HTML gracefully', () => {
    const html = '<div onclick="a()"><span>unclosed';
    const result = analyzeEvents(html);
    expect(result.events).toHaveLength(1);
    expect(result.events[0].type).toBe('onClick');
  });
});
