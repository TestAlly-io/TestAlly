import { describe, it, expect, vi } from 'vitest';
import { retryWithBackoff } from '../phase-runner.js';

describe('retryWithBackoff', () => {
  it('returns the value on first success', async () => {
    const fn = vi.fn().mockResolvedValue('ok');
    const result = await retryWithBackoff(fn, 3, 10);

    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and returns on eventual success', async () => {
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls < 3) throw new Error(`fail #${calls}`);
      return 'recovered';
    };

    const result = await retryWithBackoff(fn, 3, 10);

    expect(result).toBe('recovered');
    expect(calls).toBe(3);
  });

  it('throws the last error when all attempts fail', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'));

    await expect(retryWithBackoff(fn, 3, 10)).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it('applies exponential backoff between retries', async () => {
    vi.useFakeTimers();
    let calls = 0;
    const fn = async () => {
      calls++;
      if (calls < 3) throw new Error('fail');
      return 'done';
    };

    const promise = retryWithBackoff(fn, 3, 100);

    // First call happens immediately and fails
    await vi.advanceTimersByTimeAsync(0);
    expect(calls).toBe(1);

    // First retry after 100ms (100 * 2^0)
    await vi.advanceTimersByTimeAsync(100);
    expect(calls).toBe(2);

    // Second retry after 200ms (100 * 2^1)
    await vi.advanceTimersByTimeAsync(200);
    expect(calls).toBe(3);

    const result = await promise;
    expect(result).toBe('done');

    vi.useRealTimers();
  });

  it('does not retry when maxAttempts is 1', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('once'));

    await expect(retryWithBackoff(fn, 1, 10)).rejects.toThrow('once');
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
