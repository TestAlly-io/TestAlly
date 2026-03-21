import { describe, it, expect } from 'vitest';

describe('planning-agent module', () => {
  it('exports runPlanningAgent function', async () => {
    const mod = await import('../planning-agent.js');
    expect(typeof mod.runPlanningAgent).toBe('function');
  });

  it('runPlanningAgent requires an AnalysisInput argument', async () => {
    const mod = await import('../planning-agent.js');
    // Verify the function signature exists (arity check)
    expect(mod.runPlanningAgent.length).toBe(1);
  });
});
