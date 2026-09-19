import { clientApi } from '@/lib/client-api';
import type { Task, TaskPriority, TaskStatus } from '@/lib/types';

export type CreateTaskInput = {
  projectId: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignedToId?: number;
  dueDate?: string;
};

export type UpdateTaskInput = {
  title: string;
  description: string | null;
  priority: TaskPriority;
  assignedToId: number | null;
  dueDate: string | null;
};

export function createTask(data: CreateTaskInput) {
  return clientApi.post<Task>('/tasks', data);
}

export function updateTask(taskId: number, data: UpdateTaskInput) {
  return clientApi.patch<Task>(`/tasks/${taskId}`, data);
}

export function deleteTask(taskId: number) {
  return clientApi.delete(`/tasks/${taskId}`);
}

export function moveTask(taskId: number, status: TaskStatus, position: number) {
  return clientApi.patch(`/tasks/${taskId}/move`, { status, position });
}

export function updateTaskStatus(taskId: number, status: TaskStatus) {
  return clientApi.patch(`/tasks/${taskId}/status`, { status });
}
