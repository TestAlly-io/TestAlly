import { Router } from 'express';
import type { JobManager } from '../lib/job-manager.js';
import { standardLimiter } from '../middleware/index.js';
import type {
  ManualTestResponseSuccess,
  ManualTestResponseInProgress,
  ErrorResponse,
} from '../types/api.js';

export function createManualTestRouter(jobManager: JobManager): Router {
  const router = Router();

  router.get('/:jobId', standardLimiter, (req, res) => {
    const jobId = req.params.jobId as string;
    const job = jobManager.getJob(jobId);

    if (!job) {
      const error: ErrorResponse = {
        error: 'Not Found',
        message: `Job ${jobId} not found`,
        statusCode: 404,
      };
      res.status(404).json(error);
      return;
    }

    if (job.status === 'failed') {
      const error: ErrorResponse = {
        error: 'Analysis Failed',
        message: job.description,
        statusCode: 422,
      };
      res.status(422).json(error);
      return;
    }

    if (job.status !== 'completed' || !job.result) {
      const response: ManualTestResponseInProgress = {
        status: 'in_progress',
        jobId: job.id,
        message: `Analysis is still in progress. Poll /api/status/${job.id} for current state.`,
        statusUrl: `/api/status/${job.id}`,
      };
      res.json(response);
      return;
    }

    const response: ManualTestResponseSuccess = {
      status: 'success',
      jobId: job.id,
      analysis: job.result,
      metadata: {
        analysisTimeMs: job.completedAt
          ? new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()
          : 0,
        llmModelPrimary: 'pending',
        llmModelValidation: 'pending',
        axeVersion: 'pending',
      },
    };
    res.json(response);
  });

  return router;
}
