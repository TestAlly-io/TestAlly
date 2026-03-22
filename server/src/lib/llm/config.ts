import { ChatAnthropic } from '@langchain/anthropic';
import { ChatOpenAI } from '@langchain/openai';
import type { BaseChatModel } from '@langchain/core/language_models/chat_models';

export type LlmRole = 'planning' | 'generation' | 'validation' | 'inference' | 'authoring';
export type LlmProvider = 'anthropic' | 'openai' | 'cloudfest' | 'deepseek';

interface RoleConfig {
  provider: LlmProvider;
  apiKey?: string;
  host?: string;
  model: string;
  temperature: number;
  maxTokens: number;
}

function getCloudfestHost(): string {
  return process.env.CLOUDFEST_HOST ?? '172.26.32.29:11435';
}

const PROVIDER_DEFAULTS: Record<LlmProvider, string> = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  cloudfest: 'llama3.1:70b',
  deepseek: 'deepseek-chat',
};

function resolveRoleConfig(role: LlmRole, temperature: number, maxTokens: number): RoleConfig {
  const prefix = role.toUpperCase(); // PLANNING, GENERATION, VALIDATION

  const providerEnv = process.env[`${prefix}_LLM_PROVIDER`];
  const provider: LlmProvider = isValidProvider(providerEnv) ? providerEnv : 'cloudfest';

  const apiKey = process.env[`${prefix}_LLM_PROVIDER_KEY`];
  const host = process.env[`${prefix}_LLM_PROVIDER_HOST`];

  const modelEnv = process.env[`${prefix}_LLM_PROVIDER_MODEL`]
    ?? PROVIDER_DEFAULTS[provider];

  return { provider, apiKey, host, model: modelEnv, temperature, maxTokens };
}

function isValidProvider(value: string | undefined): value is LlmProvider {
  return value === 'anthropic' || value === 'openai' || value === 'cloudfest' || value === 'deepseek';
}

const ROLE_DEFAULTS: Record<LlmRole, { temperature: number; maxTokens: number }> = {
  planning:   { temperature: 0,   maxTokens: 4096 },
  generation: { temperature: 0.2, maxTokens: 8192 },
  validation: { temperature: 0,   maxTokens: 4096 },
  inference:  { temperature: 0.1, maxTokens: 4096 },
  authoring:  { temperature: 0.1, maxTokens: 8192 },
};

function getRoleConfig(role: LlmRole): RoleConfig {
  const defaults = ROLE_DEFAULTS[role];
  return resolveRoleConfig(role, defaults.temperature, defaults.maxTokens);
}

export function isProviderConfigured(provider: LlmProvider, role?: LlmRole): boolean {
  switch (provider) {
    case 'anthropic':
      return Boolean(
        (role && process.env[`${role.toUpperCase()}_LLM_PROVIDER_KEY`])
        || process.env.ANTHROPIC_API_KEY,
      );
    case 'openai':
      return Boolean(
        (role && process.env[`${role.toUpperCase()}_LLM_PROVIDER_KEY`])
        || process.env.OPENAI_API_KEY,
      );
    case 'deepseek':
      return Boolean(
        (role && process.env[`${role.toUpperCase()}_LLM_PROVIDER_KEY`])
      );
    case 'cloudfest':
      return true;
    default:
      return false;
  }
}

export function getModelName(role: LlmRole): string {
  return getRoleConfig(role).model;
}

function resolveApiKey(config: RoleConfig, role: LlmRole): string {
  if (config.apiKey) return config.apiKey;

  if (config.provider === 'anthropic') {
    return process.env.ANTHROPIC_API_KEY ?? '';
  }
  if (config.provider === 'openai') {
    return process.env.OPENAI_API_KEY ?? '';
  }

  throw new Error(
    `Missing API key for provider "${config.provider}" (role: ${role}). ` +
    `Set ${role.toUpperCase()}_LLM_PROVIDER_KEY in environment.`,
  );
}

/**
 * Returns the resolved base URL for a role's provider (for raw-fetch consumers).
 * Falls back to `http://{CLOUDFEST_HOST}/v1` for the cloudfest provider.
 */
export function getRoleBaseUrl(role: LlmRole): string | null {
  const config = getRoleConfig(role);
  if (config.host) return config.host;
  if (config.provider === 'cloudfest') return `http://${getCloudfestHost()}/v1`;
  return null;
}

/**
 * Returns auth headers for a role's provider (for raw-fetch consumers).
 */
export function getRoleAuthHeaders(role: LlmRole): Record<string, string> {
  const config = getRoleConfig(role);
  try {
    const key = resolveApiKey(config, role);
    if (key && key !== 'cloudfest') return { Authorization: `Bearer ${key}` };
  } catch {
    // No key configured — return empty headers
  }
  return {};
}

export function createModel(role: LlmRole): BaseChatModel {
  const config = getRoleConfig(role);

  if (!isProviderConfigured(config.provider, role)) {
    throw new Error(
      `Missing API key for provider "${config.provider}" (role: ${role}). ` +
      `Set ${role.toUpperCase()}_LLM_PROVIDER_KEY in environment.`,
    );
  }

  switch (config.provider) {
    case 'anthropic':
      return new ChatAnthropic({
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        anthropicApiKey: resolveApiKey(config, role),
        ...(config.host && { clientOptions: { baseURL: config.host } }),
      });
    case 'openai':
      return new ChatOpenAI({
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        openAIApiKey: resolveApiKey(config, role),
        ...(config.host && { configuration: { baseURL: config.host } }),
      });
    case 'deepseek':
      return new ChatOpenAI({
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        configuration: {
          baseURL: config.host ?? 'https://api.deepseek.com',
        },
        apiKey: resolveApiKey(config, role),
      });
    case 'cloudfest':
      return new ChatOpenAI({
        model: config.model,
        temperature: config.temperature,
        maxTokens: config.maxTokens,
        configuration: {
          baseURL: config.host ?? `http://${getCloudfestHost()}/v1`,
        },
        apiKey: 'cloudfest',
      });
    default:
      throw new Error(`Unsupported provider: ${config.provider as string}`);
  }
}
