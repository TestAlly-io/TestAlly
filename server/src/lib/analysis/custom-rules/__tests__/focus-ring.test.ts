import { describe, it, expect } from 'vitest';
import { focusRingRule } from '../focus-ring.js';

describe('focusRingRule', () => {
  it('flags outline:none without replacement', () => {
    const css = `
      .btn:focus {
        outline: none;
      }
    `;
    const flags = focusRingRule.run('', css);
    expect(flags).toHaveLength(1);
    expect(flags[0].ruleId).toBe('focus-ring-removal');
  });

  it('flags outline:0 without replacement', () => {
    const css = `
      button:focus {
        outline: 0;
      }
    `;
    const flags = focusRingRule.run('', css);
    expect(flags).toHaveLength(1);
  });

  it('does not flag outline:none WITH box-shadow replacement', () => {
    const css = `
      .btn:focus {
        outline: none;
        box-shadow: 0 0 0 3px blue;
      }
    `;
    const flags = focusRingRule.run('', css);
    expect(flags).toHaveLength(0);
  });

  it('does not flag outline:none WITH border replacement', () => {
    const css = `
      input:focus {
        outline: none;
        border: 2px solid blue;
      }
    `;
    const flags = focusRingRule.run('', css);
    expect(flags).toHaveLength(0);
  });

  it('returns empty for no CSS input', () => {
    const flags = focusRingRule.run('<div></div>');
    expect(flags).toHaveLength(0);
  });

  it('returns empty for CSS without outline removal', () => {
    const css = `.btn { color: blue; }`;
    const flags = focusRingRule.run('', css);
    expect(flags).toHaveLength(0);
  });

  it('flags outline:none on non-focus selectors without valid replacement', () => {
    const css = `
      .btn {
        outline: none;
      }
    `;
    const flags = focusRingRule.run('', css);
    expect(flags).toHaveLength(1);
    expect(flags[0].ruleId).toBe('focus-ring-removal');
  });

  it('handles invalid CSS gracefully', () => {
    const css = 'this is not { valid css !!!';
    const flags = focusRingRule.run('', css);
    expect(flags).toHaveLength(0);
  });
});
