import { Router } from 'express';
import type { JobManager } from '../lib/job-manager.js';
import { analyzeLimiter, validateAnalyzeInput } from '../middleware/index.js';
import type { AnalyzeRequest, AnalyzeResponse, ErrorResponse } from '../types/api.js';
import type { AnalysisInput, SourceLanguage } from '../types/analysis.js';

export function createAnalyzeRouter(jobManager: JobManager): Router {
  const router = Router();

  router.post(
    '/',
    analyzeLimiter,
    validateAnalyzeInput,
    (req, res) => {
      const body = req.body as AnalyzeRequest;

      const input: AnalysisInput = {
        code: body.code,
        // validateAnalyzeInput ensures language is a supported SourceLanguage
        language: body.language as SourceLanguage,
        description: body.description,
        css: body.css,
        js: body.js,
      };

      const job = jobManager.createJob(input);

      if (!job) {
        const error: ErrorResponse = {
          error: 'Service Unavailable',
          message: 'Server is at maximum job capacity. Try again later.',
          statusCode: 503,
        };
        res.status(503).json(error);
        return;
      }

      const response: AnalyzeResponse = {
        status: 'accepted',
        jobId: job.id,
        statusUrl: `/api/status/${job.id}`,
        resultsUrl: `/api/manual-test/${job.id}`,
      };

      res.status(202).json(response);
    },
  );

  return router;
}
