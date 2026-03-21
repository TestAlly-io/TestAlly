import { Router } from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import path from 'path';
import type { HealthResponse } from '../types/api.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(path.join(__dirname, '../../package.json'), 'utf-8'),
);

export function createHealthRouter(): Router {
  const router = Router();

  router.get('/', (_req, res) => {
    const response: HealthResponse = {
      status: 'healthy',
      version: pkg.version,
      checks: {
        llmPrimary: 'unconfigured',
        llmValidation: 'unconfigured',
        axeCore: 'loaded',
      },
    };
    res.json(response);
  });

  return router;
}
