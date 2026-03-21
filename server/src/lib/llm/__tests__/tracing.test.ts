import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

vi.mock('@langchain/core/tracers/tracer_langchain', () => ({
  LangChainTracer: vi.fn().mockImplementation((opts: Record<string, unknown>) => ({
    _projectName: opts.projectName,
  })),
}));

import { isTracingEnabled, getTracingCallbacks } from '../tracing.js';

describe('tracing', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.LANGSMITH_TRACING;
    delete process.env.LANGSMITH_TRACING_ENABLED;
    delete process.env.LANGSMITH_PROJECT;
    delete process.env.LANGSMITH_PROJECT_NAME;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('isTracingEnabled', () => {
    it('returns false by default', () => {
      expect(isTracingEnabled()).toBe(false);
    });

    it('returns false for non-true values', () => {
      process.env.LANGSMITH_TRACING = 'false';
      expect(isTracingEnabled()).toBe(false);

      process.env.LANGSMITH_TRACING = '1';
      expect(isTracingEnabled()).toBe(false);
    });

    it('returns true when LANGSMITH_TRACING is set', () => {
      process.env.LANGSMITH_TRACING = 'true';
      expect(isTracingEnabled()).toBe(true);
    });

    it('returns true when LANGSMITH_TRACING_ENABLED is set (legacy)', () => {
      process.env.LANGSMITH_TRACING_ENABLED = 'true';
      expect(isTracingEnabled()).toBe(true);
    });
  });

  describe('getTracingCallbacks', () => {
    it('returns undefined when tracing is disabled', () => {
      const result = getTracingCallbacks({
        runName: 'test-run',
        tags: ['test'],
        metadata: { foo: 'bar' },
      });
      expect(result).toBeUndefined();
    });

    it('returns config with callbacks when tracing is enabled', () => {
      process.env.LANGSMITH_TRACING = 'true';

      const result = getTracingCallbacks({
        runName: 'test-run',
        tags: ['test'],
        metadata: { foo: 'bar' },
      });

      expect(result).toBeDefined();
      expect(result!.callbacks).toHaveLength(1);
      expect(result!.runName).toBe('test-run');
      expect(result!.tags).toEqual(['test']);
      expect(result!.metadata).toEqual({ foo: 'bar' });
    });

    it('uses default project name when env var is not set', () => {
      process.env.LANGSMITH_TRACING = 'true';

      const result = getTracingCallbacks({ runName: 'test-run' });

      expect(result).toBeDefined();
      const callbacks = result!.callbacks as Array<{ _projectName: string }>;
      expect(callbacks[0]._projectName).toBe('testally-dev');
    });

    it('uses LANGSMITH_PROJECT from env', () => {
      process.env.LANGSMITH_TRACING = 'true';
      process.env.LANGSMITH_PROJECT = 'my-project';

      const result = getTracingCallbacks({ runName: 'test-run' });

      expect(result).toBeDefined();
      const callbacks = result!.callbacks as Array<{ _projectName: string }>;
      expect(callbacks[0]._projectName).toBe('my-project');
    });

    it('falls back to LANGSMITH_PROJECT_NAME (legacy)', () => {
      process.env.LANGSMITH_TRACING = 'true';
      process.env.LANGSMITH_PROJECT_NAME = 'legacy-project';

      const result = getTracingCallbacks({ runName: 'test-run' });

      expect(result).toBeDefined();
      const callbacks = result!.callbacks as Array<{ _projectName: string }>;
      expect(callbacks[0]._projectName).toBe('legacy-project');
    });
  });
});
