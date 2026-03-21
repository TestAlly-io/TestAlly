/**
 * Interface every pipeline phase runner must implement.
 *
 * Phase runners are injected into the analysis machine, allowing real
 * implementations (LLM, axe-core, etc.) to be swapped in later plans
 * while tests use lightweight stubs.
 */
export interface PhaseRunner<TInput = unknown, TOutput = unknown> {
  /** Execute this phase's logic. Throw on failure. */
  execute(input: TInput): Promise<TOutput>;
  /**
   * Optional gate: if defined and returns false, the phase will hard-fail
   * before attempting execution. Use for post-MVP hard gates (e.g. LINT errors
   * blocking further progress).
   */
  gate?(): boolean;
}

/**
 * Retry an async operation with exponential backoff.
 * Use inside PhaseRunner implementations for LLM calls.
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxAttempts: number,
  initialDelayMs: number,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, initialDelayMs * Math.pow(2, attempt - 1)),
        );
      }
    }
  }
  throw lastError;
}
