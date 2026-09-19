import { taskflowFetch } from '@/lib/taskflow-api';
import type { Comment, Task, TaskActivity } from '@/lib/types';

export function getTask(taskId: string | number) {
  return taskflowFetch<Task>(`/tasks/${taskId}`);
}

export function getTaskComments(taskId: string | number) {
  return taskflowFetch<Comment[]>(`/tasks/${taskId}/comments`);
}

export function getTaskActivity(taskId: string | number) {
  return taskflowFetch<TaskActivity[]>(`/tasks/${taskId}/activity`);
}
