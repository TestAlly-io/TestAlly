/**
 * Integration test — verifies tracing config flows through to model.invoke()
 * without breaking the call, using the actual configured LLM provider.
 *
 * Run with:  npm run test:integration
 */
import { describe, it, expect, afterAll, afterEach } from 'vitest';
import { HumanMessage } from '@langchain/core/messages';
import { createModel } from '../../server/src/lib/llm/config.js';
import { isTracingEnabled, getTracingCallbacks, flushTracing } from '../../server/src/lib/llm/tracing.js';

const originalEnv = { ...process.env };

afterEach(() => {
  process.env = { ...originalEnv };
});

afterAll(async () => {
  await flushTracing();
});

describe('tracing integration', () => {
  it('model.invoke works with tracing disabled (config is undefined)', async () => {
    delete process.env.LANGSMITH_TRACING;
    delete process.env.LANGSMITH_TRACING_ENABLED;
    expect(isTracingEnabled()).toBe(false);

    const config = getTracingCallbacks({ runName: 'test-disabled' });
    expect(config).toBeUndefined();

    const model = createModel('generation');

    const response = await model.invoke(
      [new HumanMessage('Say "ok"')],
      config,
    );

    await flushTracing();

    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    expect(content.length).toBeGreaterThan(0);
  });

  it('model.invoke works with tracing enabled (callbacks attached)', async () => {
    process.env.LANGSMITH_TRACING_ENABLED = 'true';
    process.env.LANGSMITH_PROJECT_NAME = 'testally-integration';
    expect(isTracingEnabled()).toBe(true);

    const config = getTracingCallbacks({
      runName: 'integration-test',
      tags: ['integration', 'test'],
      metadata: { test: true },
    });
    expect(config).toBeDefined();
    expect(config!.callbacks).toHaveLength(1);

    const model = createModel('generation');

    const response = await model.invoke(
      [new HumanMessage('Say "ok"')],
      config,
    );

    await flushTracing();

    const content =
      typeof response.content === 'string'
        ? response.content
        : JSON.stringify(response.content);
    expect(content.length).toBeGreaterThan(0);
  });
});
