import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createModel, getModelName, isProviderConfigured } from '../config.js';

describe('LLM config', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
    delete process.env.PLANNING_LLM_PROVIDER;
    delete process.env.PLANNING_LLM_PROVIDER_KEY;
    delete process.env.GENERATION_LLM_PROVIDER;
    delete process.env.GENERATION_LLM_PROVIDER_KEY;
    delete process.env.VALIDATION_LLM_PROVIDER;
    delete process.env.VALIDATION_LLM_PROVIDER_KEY;
    delete process.env.PLANNING_LLM_PROVIDER_MODEL;
    delete process.env.GENERATION_LLM_PROVIDER_MODEL;
    delete process.env.VALIDATION_LLM_PROVIDER_MODEL;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('getModelName', () => {
    it('returns default model when no env overrides', () => {
      const name = getModelName('planning');
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    });

    it('uses provider-specific default model for deepseek', () => {
      process.env.PLANNING_LLM_PROVIDER = 'deepseek';
      process.env.PLANNING_LLM_PROVIDER_KEY = 'test-key';
      expect(getModelName('planning')).toBe('deepseek-chat');
    });

    it('respects PLANNING_LLM_PROVIDER_MODEL override', () => {
      process.env.PLANNING_LLM_PROVIDER = 'deepseek';
      process.env.PLANNING_LLM_PROVIDER_KEY = 'test-key';
      process.env.PLANNING_LLM_PROVIDER_MODEL = 'deepseek-coder';
      expect(getModelName('planning')).toBe('deepseek-coder');
    });
  });

  describe('isProviderConfigured', () => {
    it('returns false when ANTHROPIC_API_KEY is not set', () => {
      expect(isProviderConfigured('anthropic')).toBe(false);
    });

    it('returns true when ANTHROPIC_API_KEY is set', () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';
      expect(isProviderConfigured('anthropic')).toBe(true);
    });

    it('returns true for anthropic when role-specific key is set', () => {
      process.env.PLANNING_LLM_PROVIDER_KEY = 'test-key';
      expect(isProviderConfigured('anthropic', 'planning')).toBe(true);
    });

    it('returns false when OPENAI_API_KEY is not set', () => {
      expect(isProviderConfigured('openai')).toBe(false);
    });

    it('returns true when OPENAI_API_KEY is set', () => {
      process.env.OPENAI_API_KEY = 'test-key';
      expect(isProviderConfigured('openai')).toBe(true);
    });

    it('returns true for cloudfest (no auth required)', () => {
      expect(isProviderConfigured('cloudfest')).toBe(true);
    });

    it('returns false for deepseek without key', () => {
      expect(isProviderConfigured('deepseek', 'planning')).toBe(false);
    });

    it('returns true for deepseek with role-specific key', () => {
      process.env.PLANNING_LLM_PROVIDER_KEY = 'test-key';
      expect(isProviderConfigured('deepseek', 'planning')).toBe(true);
    });
  });

  describe('createModel', () => {
    it('creates a model for planning (defaults to cloudfest)', () => {
      const model = createModel('planning');
      expect(model).toBeDefined();
      expect(typeof model.invoke).toBe('function');
    });

    it('creates a model for generation (defaults to cloudfest)', () => {
      const model = createModel('generation');
      expect(model).toBeDefined();
      expect(typeof model.invoke).toBe('function');
    });

    it('creates a model for validation (defaults to cloudfest)', () => {
      const model = createModel('validation');
      expect(model).toBeDefined();
      expect(typeof model.invoke).toBe('function');
    });

    it('creates a deepseek model when provider env is set', () => {
      process.env.PLANNING_LLM_PROVIDER = 'deepseek';
      process.env.PLANNING_LLM_PROVIDER_KEY = 'test-key';
      const model = createModel('planning');
      expect(model).toBeDefined();
      expect(typeof model.invoke).toBe('function');
    });

    it('throws when deepseek provider is set but no key', () => {
      process.env.PLANNING_LLM_PROVIDER = 'deepseek';
      expect(() => createModel('planning')).toThrow(/Missing API key/);
    });

    it('creates anthropic model with role-specific key', () => {
      process.env.PLANNING_LLM_PROVIDER = 'anthropic';
      process.env.PLANNING_LLM_PROVIDER_KEY = 'test-key';
      const model = createModel('planning');
      expect(model).toBeDefined();
    });

    it('creates openai model with role-specific key', () => {
      process.env.GENERATION_LLM_PROVIDER = 'openai';
      process.env.GENERATION_LLM_PROVIDER_KEY = 'test-key';
      const model = createModel('generation');
      expect(model).toBeDefined();
    });

    it('each role can use a different provider', () => {
      process.env.PLANNING_LLM_PROVIDER = 'deepseek';
      process.env.PLANNING_LLM_PROVIDER_KEY = 'ds-key';
      process.env.GENERATION_LLM_PROVIDER = 'anthropic';
      process.env.GENERATION_LLM_PROVIDER_KEY = 'ant-key';
      // validation defaults to cloudfest

      const planning = createModel('planning');
      const generation = createModel('generation');
      const validation = createModel('validation');

      expect(planning).toBeDefined();
      expect(generation).toBeDefined();
      expect(validation).toBeDefined();
    });
  });
});
