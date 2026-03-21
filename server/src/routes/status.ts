import { Router } from 'express';
import { jobManager } from '../lib/job-manager.js';
import { standardLimiter } from '../middleware/index.js';
import type {
  StatusResponseInProgress,
  StatusResponseCompleted,
  StatusResponseFailed,
  ErrorResponse,
} from '../types/api.js';

export const statusRouter = Router();

statusRouter.get('/:jobId', standardLimiter, (req, res) => {
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
    const response: StatusResponseFailed = {
      status: 'failed',
      jobId: job.id,
      phase: job.phase,
      description: job.description,
      errors: job.errors,
      startedAt: job.startedAt,
      failedAt: job.failedAt!,
    };
    res.json(response);
    return;
  }

  if (job.status === 'completed') {
    const response: StatusResponseCompleted = {
      status: 'completed',
      jobId: job.id,
      phase: 'COMPLETE',
      description: job.description,
      startedAt: job.startedAt,
      completedAt: job.completedAt!,
      resultsUrl: `/api/manual-test/${job.id}`,
    };
    res.json(response);
    return;
  }

  const response: StatusResponseInProgress = {
    status: 'in_progress',
    jobId: job.id,
    phase: job.phase,
    phaseIndex: job.phaseIndex,
    totalPhases: job.totalPhases,
    description: job.description,
    startedAt: job.startedAt,
    updatedAt: job.updatedAt,
  };
  res.json(response);
});
