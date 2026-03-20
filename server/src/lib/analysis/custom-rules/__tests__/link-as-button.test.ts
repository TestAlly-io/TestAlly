import { describe, it, expect } from 'vitest';
import { linkAsButtonRule } from '../link-as-button.js';

describe('linkAsButtonRule', () => {
  it('flags <a> without href but with onClick', () => {
    const html = '<a onClick="doSomething()">Click me</a>';
    const flags = linkAsButtonRule.run(html);
    expect(flags).toHaveLength(1);
    expect(flags[0].ruleId).toBe('link-as-button');
  });

  it('flags <a href="#"> with onClick', () => {
    const html = '<a href="#" onClick="doSomething()">Click me</a>';
    const flags = linkAsButtonRule.run(html);
    expect(flags).toHaveLength(1);
  });

  it('flags <a href=""> with onclick (lowercase)', () => {
    const html = '<a href="" onclick="doSomething()">Click me</a>';
    const flags = linkAsButtonRule.run(html);
    expect(flags).toHaveLength(1);
  });

  it('flags <a href="javascript:void(0)"> without explicit onClick', () => {
    const html = '<a href="javascript:void(0)">Click me</a>';
    const flags = linkAsButtonRule.run(html);
    expect(flags).toHaveLength(1);
  });

  it('does not flag <a> with valid href', () => {
    const html = '<a href="/about" onClick="track()">About</a>';
    const flags = linkAsButtonRule.run(html);
    expect(flags).toHaveLength(0);
  });

  it('does not flag <a> without onClick', () => {
    const html = '<a href="#">Section</a>';
    const flags = linkAsButtonRule.run(html);
    expect(flags).toHaveLength(0);
  });

  it('detects multiple violations', () => {
    const html = `
      <a onClick="open()">Open</a>
      <a href="#" onClick="close()">Close</a>
      <a href="/valid">Valid link</a>
    `;
    const flags = linkAsButtonRule.run(html);
    expect(flags).toHaveLength(2);
  });
});
