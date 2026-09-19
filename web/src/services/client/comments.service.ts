import { clientApi } from '@/lib/client-api';

export function createComment(taskId: number, content: string) {
  return clientApi.post(`/tasks/${taskId}/comments`, { content });
}

export function updateComment(
  taskId: number,
  commentId: number,
  content: string,
) {
  return clientApi.patch(`/tasks/${taskId}/comments/${commentId}`, { content });
}

export function deleteComment(taskId: number, commentId: number) {
  return clientApi.delete(`/tasks/${taskId}/comments/${commentId}`);
}
