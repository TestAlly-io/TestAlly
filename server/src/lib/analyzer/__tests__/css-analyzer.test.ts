import { describe, it, expect } from 'vitest';
import { analyzeCss } from '../css-analyzer.js';

describe('analyzeCss', () => {
  it('flags outline removal without replacement', () => {
    const css = '.btn:focus { outline: none; }';
    const result = analyzeCss(css);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].wcagCriteria).toContain('2.4.7 Focus Visible');
  });

  it('flags outline-width: 0 without replacement', () => {
    const css = '.link:focus { outline-width: 0; }';
    const result = analyzeCss(css);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].property).toBe('outline-width');
    expect(result.flags[0].wcagCriteria).toContain('2.4.7 Focus Visible');
  });

  it('flags outline-style: none without replacement', () => {
    const css = '.input:focus { outline-style: none; }';
    const result = analyzeCss(css);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].property).toBe('outline-style');
    expect(result.flags[0].wcagCriteria).toContain('2.4.7 Focus Visible');
  });

  it('does not flag outline removal with box-shadow replacement', () => {
    const css = '.btn:focus { outline: none; box-shadow: 0 0 0 2px blue; }';
    const result = analyzeCss(css);
    const focusFlags = result.flags.filter((f) =>
      f.wcagCriteria.includes('2.4.7 Focus Visible'),
    );
    expect(focusFlags).toHaveLength(0);
  });

  it('does not flag outline removal with border replacement', () => {
    const css = '.btn:focus { outline: none; border: 2px solid blue; }';
    const result = analyzeCss(css);
    const focusFlags = result.flags.filter((f) =>
      f.wcagCriteria.includes('2.4.7 Focus Visible'),
    );
    expect(focusFlags).toHaveLength(0);
  });

  it('flags animation without prefers-reduced-motion', () => {
    const css = '.spinner { animation: spin 1s infinite; }';
    const result = analyzeCss(css);
    expect(result.hasAnimations).toBe(true);
    expect(result.hasReducedMotionQuery).toBe(false);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].property).toBe('animation/transition');
  });

  it('flags transition without prefers-reduced-motion', () => {
    const css = '.fade { transition: opacity 0.3s ease; }';
    const result = analyzeCss(css);
    expect(result.hasAnimations).toBe(true);
    expect(result.hasReducedMotionQuery).toBe(false);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].property).toBe('animation/transition');
  });

  it('does not flag animation when prefers-reduced-motion is present', () => {
    const css = `
      .spinner { animation: spin 1s infinite; }
      @media (prefers-reduced-motion: reduce) {
        .spinner { animation: none; }
      }
    `;
    const result = analyzeCss(css);
    expect(result.hasAnimations).toBe(true);
    expect(result.hasReducedMotionQuery).toBe(true);
    expect(result.flags.some((f) => f.property === 'animation/transition')).toBe(false);
  });

  it('flags user-select:none', () => {
    const css = '.content { user-select: none; }';
    const result = analyzeCss(css);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].property).toBe('user-select');
  });

  it('flags very small font sizes', () => {
    const css = '.small { font-size: 8px; }';
    const result = analyzeCss(css);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].property).toBe('font-size');
  });

  it('flags font size at 11px boundary', () => {
    const css = '.small { font-size: 11px; }';
    const result = analyzeCss(css);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].property).toBe('font-size');
  });

  it('does not flag font size at 12px boundary', () => {
    const css = '.normal { font-size: 12px; }';
    const result = analyzeCss(css);
    expect(result.flags).toHaveLength(0);
  });

  it('flags fractional small font sizes', () => {
    const css = '.tiny { font-size: 11.5px; }';
    const result = analyzeCss(css);
    expect(result.flags).toHaveLength(1);
    expect(result.flags[0].property).toBe('font-size');
  });

  it('does not flag normal font sizes', () => {
    const css = '.normal { font-size: 16px; }';
    const result = analyzeCss(css);
    expect(result.flags.some((f) => f.property === 'font-size')).toBe(false);
  });

  it('does not flag font sizes in non-px units', () => {
    const css = '.em { font-size: 0.5em; }';
    const result = analyzeCss(css);
    expect(result.flags.some((f) => f.property === 'font-size')).toBe(false);
  });

  it('handles empty string input', () => {
    const result = analyzeCss('');
    expect(result.flags).toHaveLength(0);
    expect(result.hasAnimations).toBe(false);
    expect(result.hasReducedMotionQuery).toBe(false);
  });

  it('handles invalid CSS gracefully', () => {
    const result = analyzeCss('not valid { css !!!');
    expect(result.flags).toEqual([]);
  });

  it('returns empty for CSS with no concerns', () => {
    const css = '.btn { color: blue; padding: 10px; }';
    const result = analyzeCss(css);
    expect(result.flags).toHaveLength(0);
  });

  it('detects multiple flags in one stylesheet', () => {
    const css = `
      .btn:focus { outline: none; }
      .content { user-select: none; }
      .small { font-size: 8px; }
      .fade { transition: opacity 0.3s ease; }
    `;
    const result = analyzeCss(css);
    expect(result.flags.length).toBeGreaterThanOrEqual(4);
    expect(result.flags.some((f) => f.wcagCriteria.includes('2.4.7 Focus Visible'))).toBe(true);
    expect(result.flags.some((f) => f.property === 'user-select')).toBe(true);
    expect(result.flags.some((f) => f.property === 'font-size')).toBe(true);
    expect(result.flags.some((f) => f.property === 'animation/transition')).toBe(true);
  });
});
