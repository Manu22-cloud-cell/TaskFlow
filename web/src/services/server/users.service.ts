import { taskflowFetch } from '@/lib/taskflow-api';
import type { User, UserSummary } from '@/lib/types';

export function getUsers() {
  return taskflowFetch<User[]>('/users');
}

export function getUserSummaries() {
  return taskflowFetch<UserSummary[]>('/users');
}
