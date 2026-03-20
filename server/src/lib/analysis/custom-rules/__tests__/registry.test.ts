import { describe, it, expect } from 'vitest';
import { runCustomRules, getRegisteredRules } from '../index.js';

describe('Custom Rules Registry', () => {
  it('runs all registered rules', () => {
    const html = '<a onClick="x()">Click</a>';
    const css = 'button:focus { outline: none; }';

    const flags = runCustomRules(html, css);
    expect(flags.length).toBeGreaterThanOrEqual(2);
  });

  it('returns metadata for registered rules', () => {
    const rules = getRegisteredRules();
    expect(rules).toHaveLength(2);
    expect(rules.map((r) => r.id)).toContain('link-as-button');
    expect(rules.map((r) => r.id)).toContain('focus-ring-removal');
  });
});
