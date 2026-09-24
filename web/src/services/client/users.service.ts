import { clientApi } from '@/lib/client-api';
import type { PaginatedUsers, User, UserRole, UserSummary } from '@/lib/types';

export type ListUsersQuery = {
  search?: string;
  page?: number;
  limit?: number;
};

export function getUsers(query: ListUsersQuery = {}) {
  const params = new URLSearchParams();

  if (query.search) params.set('search', query.search);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const value = params.toString();

  return clientApi
    .get<PaginatedUsers>(`/users${value ? `?${value}` : ''}`)
    .then((response) => response.data);
}

export function getUserSummaries(query: ListUsersQuery = {}) {
  return getUsers(query).then((response) =>
    response.data.map<UserSummary>(({ id, name, email }) => ({
      id,
      name,
      email,
    })),
  );
}

export function updateUserRole(userId: number, role: UserRole) {
  return clientApi.patch<User>(`/users/${userId}`, { role });
}
