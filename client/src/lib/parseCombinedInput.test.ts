import { describe, expect, it } from 'vitest';
import { parseCombinedInput, validateComponentSourceOnly } from './parseCombinedInput';

const NEWSLETTER_HTML = `<section>
  <h2>Newsletter</h2>
  <label for="email">Email</label>
  <input id="email" type="email" name="email" autocomplete="email" />
  <button type="submit">Subscribe</button>
</section>`;

describe('parseCombinedInput', () => {
  it('treats plain HTML newsletter block as code only', () => {
    const out = parseCombinedInput(NEWSLETTER_HTML);
    expect(out.description).toBe('');
    expect(out.code.trim()).toBe(NEWSLETTER_HTML.trim());
    expect(out.language).toBe('html');
  });

  it('decodes entity-escaped markup when no raw angle brackets', () => {
    const escaped = NEWSLETTER_HTML.replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const out = parseCombinedInput(escaped);
    expect(out.description).toBe('');
    expect(out.code).toContain('<section>');
    expect(out.language).toBe('html');
  });

  it('normalizes fullwidth angle brackets', () => {
    const fw = NEWSLETTER_HTML.replace(/</g, '\uFF1C').replace(/>/g, '\uFF1E');
    const out = parseCombinedInput(fw);
    expect(out.description).toBe('');
    expect(out.code).toContain('<section>');
  });
});

describe('validateComponentSourceOnly', () => {
  it('accepts newsletter HTML', () => {
    const v = validateComponentSourceOnly(NEWSLETTER_HTML);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.source).toContain('Newsletter');
  });

  it('rejects notes plus markdown code (prose outside code)', () => {
    const v = validateComponentSourceOnly(`See below.

\`\`\`html
<h1>Hi</h1>
\`\`\``);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.message).toContain('notes above or below');
  });
});
