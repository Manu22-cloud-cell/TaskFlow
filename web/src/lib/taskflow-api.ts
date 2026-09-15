import { getAccessToken } from './auth';

const baseUrl = process.env.TASKFLOW_API_URL;
if (!baseUrl) throw new Error('TASKFLOW_API_URL is not configured');

export class TaskFlowApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function taskflowFetch<T>(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
    cache: 'no-store',
  });
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new TaskFlowApiError(
      response.status,
      body?.message ?? 'TaskFlow request failed',
    );
  }
  return response.json() as Promise<T>;
}
