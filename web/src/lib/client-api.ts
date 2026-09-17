import axios from 'axios';

export const clientApi = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

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
