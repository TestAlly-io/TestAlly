import type {
  AnalyzeRequest,
  AnalyzeResponse,
  ChatComponentRequest,
  ChatComponentResponse,
  InferComponentResponse,
  JobStatus,
  ManualTestResponse,
} from './types/api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!response.ok) {
    const ct = response.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) {
      const body = (await response.json().catch(() => ({}))) as {
        message?: string;
        error?: string;
      };
      throw new Error(body.message || body.error || `HTTP ${response.status}`);
    }
    const text = await response.text();
    const snippet = text.replace(/\s+/g, ' ').trim().slice(0, 240);
    throw new Error(snippet || `HTTP ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function submitAnalysis(input: AnalyzeRequest): Promise<AnalyzeResponse> {
  return request<AnalyzeResponse>('/analyze', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/** LLM: classify pasted content — language, pattern label, split description vs code. */
export async function inferComponent(raw: string): Promise<InferComponentResponse> {
  return request<InferComponentResponse>('/infer-component', {
    method: 'POST',
    body: JSON.stringify({ raw }),
  });
}

const CHAT_CLIENT_TIMEOUT_MS = Math.max(
  Number(import.meta.env.VITE_CHAT_TIMEOUT_MS) || 135_000,
  10_000,
);

/** Chat tab: send transcript + optional draft, receive assistant reply and merged draft. */
export async function postChatComponentTurn(
  body: ChatComponentRequest,
): Promise<ChatComponentResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_CLIENT_TIMEOUT_MS);
  try {
    return await request<ChatComponentResponse>('/chat-component', {
      method: 'POST',
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (e) {
    const isAbort =
      (e instanceof DOMException && e.name === 'AbortError') ||
      (e instanceof Error && e.name === 'AbortError');
    if (isAbort) {
      throw new Error(
        `Chat request timed out after ${Math.round(CHAT_CLIENT_TIMEOUT_MS / 1000)}s. Check the server is running, LLM_API_URL is set, and your LLM is reachable.`,
      );
    }
    if (e instanceof TypeError) {
      throw new Error(
        "Can't reach the API. Run both client and server (e.g. npm run dev) and ensure Vite proxies /api to the API port.",
      );
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
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
