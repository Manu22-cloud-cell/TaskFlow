import { clientApi } from '@/lib/client-api';
import { bindPushOwner } from '@/features/realtime/firebase-push';
import type { User } from '@/lib/types';

export function login(credentials: { email: string; password: string }) {
  return clientApi.post('/auth/login', credentials);
}

export function register(data: {
  name: string;
  email: string;
  password: string;
}) {
  return clientApi.post('/auth/register', data);
}

export async function logout() {
  await bindPushOwner(null).catch(() => undefined);
  return clientApi.post('/auth/logout');
}

export function refreshSession() {
  return clientApi.post('/auth/refresh');
}

export function getCurrentUser() {
  return clientApi.get<User>('/auth/me').then((response) => response.data);
}
