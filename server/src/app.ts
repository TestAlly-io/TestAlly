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
import { inferComponentFromPaste } from './lib/llmInferComponent.js';
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
    if (!isLlmConfigured()) {
      res.status(503).json({
        ok: false,
        via: 'none',
        message: 'LLM_API_URL is not set',
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
   * LLM-based split + classify for pasted component material (OpenAI-compatible API at LLM_API_URL).
   */
  app.post('/api/infer-component', async (req, res) => {
    const raw = typeof req.body?.raw === 'string' ? req.body.raw : '';
    if (!raw.trim()) {
      res.status(400).json({ error: 'Bad Request', message: 'raw is required' });
      return;
    }
    if (!isLlmConfigured()) {
      res.status(503).json({
        error: 'Service Unavailable',
        message: 'LLM not configured (set LLM_API_URL)',
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

  if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
