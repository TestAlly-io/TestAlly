import { describe, it, expect } from 'vitest';

describe('authoring-agent module', () => {
  it('exports runAuthoringAgent function', async () => {
    const mod = await import('../authoring-agent.js');
    expect(typeof mod.runAuthoringAgent).toBe('function');
  });

  it('runAuthoringAgent requires a GenerateValidateInput argument', async () => {
    const mod = await import('../authoring-agent.js');
    expect(mod.runAuthoringAgent.length).toBe(1);
  });
});
