import axios, { type AxiosRequestConfig } from 'axios';

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

const serverApi = axios.create({ baseURL: baseUrl });

export async function taskflowFetch<T>(
  path: string,
  config: AxiosRequestConfig = {},
) {
  const token = await getAccessToken();

  try {
    const response = await serverApi.request<T>({
      ...config,
      url: path,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...config.headers,
      },
    });

    return response.data;
  } catch (error) {
    if (!axios.isAxiosError(error)) throw error;

    throw new TaskFlowApiError(
      error.response?.status ?? 500,
      error.response?.data?.message ?? 'TaskFlow request failed',
    );
  }
}
