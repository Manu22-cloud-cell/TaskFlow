import { taskflowFetch } from '@/lib/taskflow-api';
import type { User } from '@/lib/types';

export function getCurrentUser() {
  return taskflowFetch<User>('/auth/me');
}
