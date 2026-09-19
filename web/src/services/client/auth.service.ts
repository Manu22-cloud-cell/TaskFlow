import { clientApi } from '@/lib/client-api';

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

export function logout() {
  return clientApi.post('/auth/logout');
}
