import { clientApi } from '@/lib/client-api';
import type { User, UserRole } from '@/lib/types';

export function updateUserRole(userId: number, role: UserRole) {
  return clientApi.patch<User>(`/users/${userId}`, { role });
}
