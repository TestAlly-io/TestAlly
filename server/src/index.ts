import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { corsMiddleware } from './middleware/index.js';
import {
  analyzeRouter,
  statusRouter,
  manualTestRouter,
  healthRouter,
} from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.API_PORT ?? 3001;

app.use(corsMiddleware);
app.use(express.json({ limit: '200kb' }));

app.use('/api/analyze', analyzeRouter);
app.use('/api/status', statusRouter);
app.use('/api/manual-test', manualTestRouter);
app.use('/api/health', healthRouter);

if (process.env.NODE_ENV === 'production') {
  const clientDist = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientDist));
  app.get('/{*splat}', (_req, res) => {
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`TestAlly server running on port ${PORT}`);
});

export { app };
