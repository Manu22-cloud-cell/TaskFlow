import axios, { type InternalAxiosRequestConfig } from 'axios';

import { toast } from '@/features/ui/components/toast-provider';

const baseURL = process.env.NEXT_PUBLIC_TASKFLOW_API_URL;

if (!baseURL) {
  throw new Error('NEXT_PUBLIC_TASKFLOW_API_URL is not configured');
}

export const clientApi = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const authApi = axios.create({ baseURL, withCredentials: true });

type RetriableRequest = InternalAxiosRequestConfig & {
  hasRetriedAfterRefresh?: boolean;
};

let refreshRequest: Promise<void> | null = null;

async function refreshAccessToken() {
  if (!refreshRequest) {
    refreshRequest = authApi
      .post('/auth/refresh')
      .then(() => undefined)
      .finally(() => {
        refreshRequest = null;
      });
  }

  return refreshRequest;
}

clientApi.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (!axios.isAxiosError(error) || error.response?.status !== 401) {
      return Promise.reject(error);
    }

    const request = error.config as RetriableRequest | undefined;
    const isAuthRequest = request?.url?.startsWith('/auth/');

    if (!request || request.hasRetriedAfterRefresh || isAuthRequest) {
      return Promise.reject(error);
    }

    request.hasRetriedAfterRefresh = true;

    try {
      await refreshAccessToken();
      return clientApi(request);
    } catch {
      if (typeof window !== 'undefined') {
        window.location.replace('/login');
      }

      return Promise.reject(error);
    }
  },
);

clientApi.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    const isUnexpectedFailure =
      axios.isAxiosError(error) &&
      (!error.response || error.response.status >= 500);

    if (isUnexpectedFailure) {
      toast.error(getClientApiError(error));
    }

    return Promise.reject(error);
  },
);

type ApiErrorResponse = {
  message?: string | string[];
};

export function getClientApiError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) return fallback;

  const message = error.response?.data?.message;

  if (Array.isArray(message)) return message.join(', ');
  if (message) return message;

  return error.request
    ? 'Unable to connect to TaskFlow. Please try again.'
    : fallback;
}
