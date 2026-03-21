import type { RunnableConfig } from '@langchain/core/runnables';
import { LangChainTracer } from '@langchain/core/tracers/tracer_langchain';
import { awaitAllCallbacks } from '@langchain/core/callbacks/promises';

export function isTracingEnabled(): boolean {
  return (
    process.env.LANGSMITH_TRACING === 'true' ||
    process.env.LANGSMITH_TRACING_ENABLED === 'true'
  );
}

export function getTracingCallbacks(options: {
  runName: string;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): RunnableConfig | undefined {
  if (!isTracingEnabled()) {
    return undefined;
  }

  const projectName =
    process.env.LANGSMITH_PROJECT ??
    process.env.LANGSMITH_PROJECT_NAME ??
    'testally-dev';
  const tracer = new LangChainTracer({ projectName });

  return {
    callbacks: [tracer],
    runName: options.runName,
    tags: options.tags,
    metadata: options.metadata,
  };
}

/**
 * Wait for all pending LangChain callbacks (including auto-tracing) to flush.
 * Call this after LLM invocations to prevent runs stuck in "running" state on LangSmith.
 */
export async function flushTracing(): Promise<void> {
  try {
    await awaitAllCallbacks();
  } catch {
    // Tracing failures should never block the main flow
  }
}
