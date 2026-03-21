import { Router } from 'express';
import type { HealthResponse } from '../types/api.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  const response: HealthResponse = {
    status: 'healthy',
    version: '1.0.0',
    checks: {
      llmPrimary: 'unconfigured',
      llmValidation: 'unconfigured',
      axeCore: 'loaded',
    },
  };
  res.json(response);
});
