import { describe, it, expect } from 'vitest';
import { extractJson } from '../utils.js';

describe('extractJson', () => {
  it('parses plain JSON object', () => {
    const result = extractJson('{"key": "value"}');
    expect(result).toEqual({ key: 'value' });
  });

  it('parses plain JSON array', () => {
    const result = extractJson('[1, 2, 3]');
    expect(result).toEqual([1, 2, 3]);
  });

  it('extracts JSON from markdown code fence', () => {
    const input = '```json\n{"key": "value"}\n```';
    expect(extractJson(input)).toEqual({ key: 'value' });
  });

  it('extracts JSON from code fence without language tag', () => {
    const input = '```\n{"key": "value"}\n```';
    expect(extractJson(input)).toEqual({ key: 'value' });
  });

  it('extracts JSON surrounded by prose', () => {
    const input = 'Here is the result:\n\n{"key": "value"}\n\nThat is all.';
    expect(extractJson(input)).toEqual({ key: 'value' });
  });

  it('extracts JSON array surrounded by prose', () => {
    const input = 'The data: [{"id": 1}] end.';
    expect(extractJson(input)).toEqual([{ id: 1 }]);
  });

  it('handles nested objects', () => {
    const nested = { a: { b: { c: 'deep' } }, d: [1, 2] };
    const input = `Here: ${JSON.stringify(nested)} done.`;
    expect(extractJson(input)).toEqual(nested);
  });

  it('handles strings containing braces', () => {
    const obj = { text: 'use {placeholder} here' };
    const input = JSON.stringify(obj);
    expect(extractJson(input)).toEqual(obj);
  });

  it('throws on empty string', () => {
    expect(() => extractJson('')).toThrow('No JSON found');
  });

  it('throws on text with no JSON', () => {
    expect(() => extractJson('This is just plain text without any data.')).toThrow(
      'No JSON found',
    );
  });

  it('throws on malformed JSON', () => {
    expect(() => extractJson('{key: value}')).toThrow();
  });

  it('prefers code fence over surrounding prose', () => {
    const input = 'prefix {"wrong": true} ```json\n{"right": true}\n``` suffix';
    expect(extractJson(input)).toEqual({ right: true });
  });
});
