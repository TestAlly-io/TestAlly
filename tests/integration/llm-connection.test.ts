/**
 * Integration tests for the LLM layer.
 *
 * These hit the real configured LLM provider (per-role env vars).
 * Run with:  npm run test:integration
 */
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';
import { createModel, getModelName } from '../../server/src/lib/llm/config.js';
import { flushTracing } from '../../server/src/lib/llm/tracing.js';

let reachable = false;

beforeAll(async () => {
  try {
    const model = createModel('generation');
    const response = await model.invoke(
      [new HumanMessage('Reply with exactly one word: hello')],
    );
    await flushTracing();
    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    reachable = content.length > 0;
  } catch {
    reachable = false;
  }
});

afterAll(async () => {
  await flushTracing();
});

describe('LLM connectivity', () => {
  it('configured provider is reachable', () => {
    expect(reachable).toBe(true);
  });

  it('getModelName returns expected model', () => {
    const name = getModelName('generation');
    expect(typeof name).toBe('string');
    expect(name.length).toBeGreaterThan(0);
  });

  it('can invoke a simple completion via LangChain', async ({ skip }) => {
    if (!reachable) skip();

    const model = createModel('generation');

    const response = await model.invoke([
      new HumanMessage('Reply with exactly one word: hello'),
    ]);

    await flushTracing();

    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);

    expect(content.length).toBeGreaterThan(0);
  });
});
