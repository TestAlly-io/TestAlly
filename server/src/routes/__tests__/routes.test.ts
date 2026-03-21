import { describe, it, expect, beforeEach, vi } from 'vitest';
import express from 'express';
import request from 'supertest';
import { JobManager } from '../../lib/job-manager.js';
import type { AutomatedResults, ComponentAnalysis } from '../../types/analysis.js';
import type { ManualTest } from '../../types/ittt.js';
import type { ValidationOutput } from '../../lib/runners/validate-runner.js';
import type { Job } from '../../types/job.js';
import type {
  AnalyzeResponse,
  StatusResponseInProgress,
  StatusResponseCompleted,
  StatusResponseFailed,
  ManualTestResponseSuccess,
  ManualTestResponseInProgress,
  ErrorResponse,
  HealthResponse,
} from '../../types/api.js';
import { createAnalyzeRouter } from '../analyze.js';
import { createStatusRouter } from '../status.js';
import { createManualTestRouter } from '../manual-test.js';
import { createHealthRouter } from '../health.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createTestApp(jobManager: JobManager) {
  const app = express();
  app.use(express.json());
  app.use('/api/analyze', createAnalyzeRouter(jobManager));
  app.use('/api/status', createStatusRouter(jobManager));
  app.use('/api/manual-test', createManualTestRouter(jobManager));
  app.use('/api/health', createHealthRouter());
  return app;
}

const defaultRunners = () => ({
  lint: {
    execute: async (): Promise<AutomatedResults> => ({
      axeViolations: [],
      eslintMessages: [],
      customRuleFlags: [],
    }),
  },
  analyze: {
    execute: async (): Promise<ComponentAnalysis> => ({
      patternType: 'accordion' as const,
      patternConfidence: 90,
      events: [],
      cssFlags: [],
      ariaFindings: [],
    }),
  },
  generate: {
    execute: async (): Promise<ManualTest[]> => [],
  },
  validate: {
    execute: async (): Promise<ValidationOutput> => ({ confidence: 1.0, passed: true }),
  },
});

/** Runners that never resolve — keeps jobs stuck in LINT phase. */
const blockingRunners = () => ({
  lint: { execute: () => new Promise<AutomatedResults>(() => {}) },
  analyze: { execute: () => new Promise<ComponentAnalysis>(() => {}) },
  generate: { execute: () => new Promise<ManualTest[]>(() => {}) },
  validate: { execute: () => new Promise<ValidationOutput>(() => {}) },
});

/** Wait until a job reaches a terminal state. */
function waitForDone(job: Job): Promise<void> {
  return vi.waitFor(
    () => {
      if (job.status !== 'completed' && job.status !== 'failed') {
        throw new Error(`still ${job.status}`);
      }
    },
    { timeout: 2000, interval: 10 },
  );
}

const validInput = { code: '<div class="accordion">test</div>', language: 'html' };

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('API Routes', () => {
  let jobManager: JobManager;
  let app: ReturnType<typeof express>;

  beforeEach(() => {
    jobManager = new JobManager(defaultRunners());
    app = createTestApp(jobManager);
  });

  // ---- Health ----

  describe('GET /api/health', () => {
    it('returns 200 with healthy status and check fields', async () => {
      const res = await request(app).get('/api/health');

      expect(res.status).toBe(200);

      const body = res.body as HealthResponse;
      expect(body.status).toBe('healthy');
      expect(body.version).toBe('1.0.0');
      expect(body.checks.llmPrimary).toBe('unconfigured');
      expect(body.checks.llmValidation).toBe('unconfigured');
      expect(body.checks.axeCore).toBe('loaded');
    });
  });

  // ---- POST /api/analyze ----

  describe('POST /api/analyze', () => {
    it('accepts valid input and returns 202 with a jobId', async () => {
      const res = await request(app)
        .post('/api/analyze')
        .send(validInput);

      expect(res.status).toBe(202);

      const body = res.body as AnalyzeResponse;
      expect(body.status).toBe('accepted');
      expect(body.jobId).toMatch(/^job_/);
      expect(body.statusUrl).toContain('/api/status/');
      expect(body.resultsUrl).toContain('/api/manual-test/');
    });

    it('returns 503 when at maximum job capacity', async () => {
      jobManager = new JobManager(blockingRunners());
      app = createTestApp(jobManager);

      for (let i = 0; i < 10; i++) {
        await request(app).post('/api/analyze').send(validInput);
      }

      const res = await request(app)
        .post('/api/analyze')
        .send(validInput);

      expect(res.status).toBe(503);

      const body = res.body as ErrorResponse;
      expect(body.error).toBe('Service Unavailable');
      expect(body.statusCode).toBe(503);
    });
  });

  // ---- GET /api/status/:jobId ----

  describe('GET /api/status/:jobId', () => {
    it('returns 404 for an unknown job ID', async () => {
      const res = await request(app).get('/api/status/nonexistent');

      expect(res.status).toBe(404);

      const body = res.body as ErrorResponse;
      expect(body.error).toBe('Not Found');
      expect(body.statusCode).toBe(404);
    });

    it('returns job status after creation', async () => {
      const createRes = await request(app)
        .post('/api/analyze')
        .send(validInput);
      const { jobId } = createRes.body as AnalyzeResponse;

      const res = await request(app).get(`/api/status/${jobId}`);

      expect(res.status).toBe(200);
      expect(res.body.jobId).toBe(jobId);
      expect(['in_progress', 'completed']).toContain(res.body.status);
    });

    it('returns completed status for a finished job', async () => {
      const createRes = await request(app)
        .post('/api/analyze')
        .send(validInput);
      const { jobId } = createRes.body as AnalyzeResponse;
      const job = jobManager.getJob(jobId)!;
      await waitForDone(job);

      const res = await request(app).get(`/api/status/${jobId}`);

      expect(res.status).toBe(200);

      const body = res.body as StatusResponseCompleted;
      expect(body.status).toBe('completed');
      expect(body.phase).toBe('COMPLETE');
      expect(body.completedAt).toBeDefined();
      expect(body.resultsUrl).toContain(jobId);
    });

    it('returns failed status for a failed job', async () => {
      jobManager = new JobManager({
        ...defaultRunners(),
        lint: {
          execute: async () => { throw new Error('LLM unavailable'); },
        },
      });
      app = createTestApp(jobManager);

      const createRes = await request(app)
        .post('/api/analyze')
        .send(validInput);
      const { jobId } = createRes.body as AnalyzeResponse;
      const job = jobManager.getJob(jobId)!;
      await waitForDone(job);

      const res = await request(app).get(`/api/status/${jobId}`);

      expect(res.status).toBe(200);

      const body = res.body as StatusResponseFailed;
      expect(body.status).toBe('failed');
      expect(body.errors.length).toBeGreaterThan(0);
      expect(body.failedAt).toBeDefined();
    });

    it('returns in_progress for a job still running', async () => {
      jobManager = new JobManager(blockingRunners());
      app = createTestApp(jobManager);

      const createRes = await request(app)
        .post('/api/analyze')
        .send(validInput);
      const { jobId } = createRes.body as AnalyzeResponse;

      const res = await request(app).get(`/api/status/${jobId}`);

      expect(res.status).toBe(200);

      const body = res.body as StatusResponseInProgress;
      expect(body.status).toBe('in_progress');
      expect(body.phase).toBeDefined();
      expect(body.phaseIndex).toBeDefined();
      expect(body.totalPhases).toBeDefined();
      expect(body.startedAt).toBeDefined();
      expect(body.updatedAt).toBeDefined();
    });
  });

  // ---- GET /api/manual-test/:jobId ----

  describe('GET /api/manual-test/:jobId', () => {
    it('returns 404 for an unknown job ID', async () => {
      const res = await request(app).get('/api/manual-test/nonexistent');

      expect(res.status).toBe(404);

      const body = res.body as ErrorResponse;
      expect(body.error).toBe('Not Found');
      expect(body.statusCode).toBe(404);
    });

    it('returns in_progress for an unfinished job', async () => {
      jobManager = new JobManager(blockingRunners());
      app = createTestApp(jobManager);

      const createRes = await request(app)
        .post('/api/analyze')
        .send(validInput);
      const { jobId } = createRes.body as AnalyzeResponse;

      const res = await request(app).get(`/api/manual-test/${jobId}`);

      expect(res.status).toBe(200);

      const body = res.body as ManualTestResponseInProgress;
      expect(body.status).toBe('in_progress');
      expect(body.message).toContain('still in progress');
      expect(body.statusUrl).toContain(jobId);
    });

    it('returns 422 for a failed job', async () => {
      jobManager = new JobManager({
        ...defaultRunners(),
        lint: {
          execute: async () => { throw new Error('LLM unavailable'); },
        },
      });
      app = createTestApp(jobManager);

      const createRes = await request(app)
        .post('/api/analyze')
        .send(validInput);
      const { jobId } = createRes.body as AnalyzeResponse;
      const job = jobManager.getJob(jobId)!;
      await waitForDone(job);

      const res = await request(app).get(`/api/manual-test/${jobId}`);

      expect(res.status).toBe(422);

      const body = res.body as ErrorResponse;
      expect(body.error).toBe('Analysis Failed');
      expect(body.statusCode).toBe(422);
    });

    it('returns the full result for a completed job', async () => {
      const createRes = await request(app)
        .post('/api/analyze')
        .send(validInput);
      const { jobId } = createRes.body as AnalyzeResponse;
      const job = jobManager.getJob(jobId)!;
      await waitForDone(job);

      const res = await request(app).get(`/api/manual-test/${jobId}`);

      expect(res.status).toBe(200);

      const body = res.body as ManualTestResponseSuccess;
      expect(body.status).toBe('success');
      expect(body.jobId).toBe(jobId);
      expect(body.analysis).toBeDefined();
      expect(body.analysis.component).toBeDefined();
      expect(body.metadata.llmModelPrimary).toBe('pending');
      expect(body.metadata.llmModelValidation).toBe('pending');
      expect(body.metadata.axeVersion).toBe('pending');
    });
  });
});
