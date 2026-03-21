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

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp(jobManager?: JobManager): express.Express {
  const app = express();
  const jm = jobManager ?? new JobManager();

  app.use(corsMiddleware);
  app.use(express.json({ limit: '200kb' }));

  app.use('/api/analyze', createAnalyzeRouter(jm));
  app.use('/api/status', createStatusRouter(jm));
  app.use('/api/manual-test', createManualTestRouter(jm));
  app.use('/api/health', createHealthRouter());

  if (process.env.NODE_ENV === 'production') {
    const clientDist = path.join(__dirname, '../../client/dist');
    app.use(express.static(clientDist));
    app.get('/{*splat}', (_req, res) => {
      res.sendFile(path.join(clientDist, 'index.html'));
    });
  }

  return app;
}
