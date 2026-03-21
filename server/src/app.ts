import './loadEnv.js';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { corsMiddleware } from './middleware/index.js';
import { JobManager } from './lib/job-manager.js';
import {
  createAnalyzeRouter,
  createStatusRouter,
  createManualTestRouter,
  createHealthRouter,
} from './routes/index.js';
import { isLlmConfigured } from './lib/llmConfig.js';
import { inferComponentFromPaste, isInferenceConfigured } from './lib/llmInferComponent.js';
import { runChatComponentTurn, validateChatComponentBody } from './lib/llmChatComponent.js';
import { probeLlmConnection } from './lib/llmProbe.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(jobManager?: JobManager): express.Express {
  const app = express();
  const jm = jobManager ?? new JobManager();

  const MAX_INFER_CHARS = 50_000;

  app.use(corsMiddleware);
  app.use(express.json({ limit: '200kb' }));

  app.use('/api/analyze', createAnalyzeRouter(jm));
  app.use('/api/status', createStatusRouter(jm));
  app.use('/api/manual-test', createManualTestRouter(jm));
  app.use('/api/health', createHealthRouter());

  /** Active connectivity check: Ollama /api/tags or OpenAI-compatible GET /v1/models */
  app.get('/api/health/llm', async (_req, res) => {
    if (!isInferenceConfigured()) {
      res.status(503).json({
        ok: false,
        via: 'none',
        message: 'LLM not configured — set LLM_API_URL or INFERENCE_LLM_PROVIDER_* / CLOUDFEST_HOST',
      });
      return;
    }
    const result = await probeLlmConnection();
    if (result.ok) {
      res.json(result);
      return;
    }
    res.status(502).json(result);
  });

  /**
   * LLM-based split + classify for pasted component material.
   */
  app.post('/api/infer-component', async (req, res) => {
    const raw = typeof req.body?.raw === 'string' ? req.body.raw : '';
    if (!raw.trim()) {
      res.status(400).json({ error: 'Bad Request', message: 'raw is required' });
      return;
    }
    if (!isInferenceConfigured()) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'LLM not configured — set LLM_API_URL or INFERENCE_LLM_PROVIDER_* / CLOUDFEST_HOST',
      });
      return;
    }
    try {
      const result = await inferComponentFromPaste(raw.slice(0, MAX_INFER_CHARS));
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'LLM request failed';
      console.error('[infer-component]', err);
      res.status(502).json({ error: 'Bad Gateway', message });
    }
  });

  /**
   * Multi-turn natural language + draft merge for the Chat tab (stateless; client sends full history).
   */
  app.post('/api/chat-component', async (req, res) => {
    const parsed = validateChatComponentBody(req.body);
    if (!parsed) {
      res.status(400).json({
        error: 'Bad Request',
        message:
          'Expected { messages: [{ role, content }], draft? } with non-empty messages ending in a user turn',
      });
      return;
    }
    if (!isLlmConfigured()) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'LLM not configured — set LLM_API_URL or INFERENCE_LLM_PROVIDER_* / CLOUDFEST_HOST',
      });
      return;
    }
    try {
      const result = await runChatComponentTurn(parsed.messages, parsed.draft);
      res.json(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'LLM request failed';
      console.error('[chat-component]', err);
      res.status(502).json({ error: 'Bad Gateway', message });
    }
  });

  if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
