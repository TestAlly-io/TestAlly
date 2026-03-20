import type {
  AnalyzeRequest,
  AnalyzeResponse,
  JobStatus,
  ManualTestResponse,
} from './types/api';

const API_BASE = '/api';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function submitAnalysis(input: AnalyzeRequest): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>('/analyze', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function getJobStatus(jobId: string): Promise<JobStatus> {
  return request<JobStatus>(`/status/${jobId}`);
}

export async function getManualTestResults(jobId: string): Promise<ManualTestResponse> {
  return request<ManualTestResponse>(`/manual-test/${jobId}`);
}

/**
 * Poll job status until completion or failure.
 * Calls onProgress with each status update.
 */
export async function pollJobStatus(
  jobId: string,
  onProgress: (status: JobStatus) => void,
  intervalMs = 1500,
): Promise<JobStatus> {
  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        const status = await getJobStatus(jobId);
        onProgress(status);

        if (status.status === 'completed') {
          resolve(status);
          return;
        }
        if (status.status === 'failed') {
          reject(new Error(status.description || 'Analysis failed'));
          return;
        }

        setTimeout(poll, intervalMs);
      } catch (error) {
        reject(error);
      }
    };

    poll();
  });
}
