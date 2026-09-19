import { taskflowFetch } from '@/lib/taskflow-api';
import type { PaginatedTasks, Project, ProjectMember } from '@/lib/types';

export function getProjects() {
  return taskflowFetch<Project[]>('/projects');
}

export function getProject(projectId: string | number) {
  return taskflowFetch<Project>(`/projects/${projectId}`);
}

export function getProjectMembers(projectId: string | number) {
  return taskflowFetch<ProjectMember[]>(`/projects/${projectId}/members`);
}

export function getProjectTasks(
  projectId: string | number,
  query: URLSearchParams,
) {
  return taskflowFetch<PaginatedTasks>(
    `/projects/${projectId}/tasks?${query.toString()}`,
  );
}
