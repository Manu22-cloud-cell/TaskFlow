import { clientApi } from '@/lib/client-api';
import type { User, UserRole, UserSummary } from '@/lib/types';

export function getUsers() {
  return clientApi.get<User[]>('/users').then((response) => response.data);
}

export function getUserSummaries() {
  return clientApi
    .get<UserSummary[]>('/users')
    .then((response) => response.data);
}

export function updateUserRole(userId: number, role: UserRole) {
  return clientApi.patch<User>(`/users/${userId}`, { role });
}
