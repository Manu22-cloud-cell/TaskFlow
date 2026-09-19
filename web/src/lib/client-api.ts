import axios, { type InternalAxiosRequestConfig } from 'axios';

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

type ApiErrorResponse = {
  message?: string | string[];
};

export function getClientApiError(
  error: unknown,
  fallback = 'Something went wrong. Please try again.',
) {
  if (!axios.isAxiosError<ApiErrorResponse>(error)) return fallback;

  const message = error.response?.data?.message;

  return Array.isArray(message) ? message.join(', ') : (message ?? fallback);
}
