import { clientApi } from '@/lib/client-api';
import type {
  PaginatedTasks,
  PaginatedProjects,
  Project,
  ProjectMember,
  ProjectStatus,
} from '@/lib/types';

export type CreateProjectInput = {
  name: string;
  description?: string;
  status: ProjectStatus;
  ownerId?: number;
};

export type ListProjectsQuery = {
  search?: string;
  status?: ProjectStatus;
  page?: number;
  limit?: number;
};

export function getProjects(query: ListProjectsQuery = {}) {
  const params = new URLSearchParams();

  if (query.search) params.set('search', query.search);
  if (query.status) params.set('status', query.status);
  if (query.page) params.set('page', String(query.page));
  if (query.limit) params.set('limit', String(query.limit));

  const value = params.toString();

  return clientApi
    .get<PaginatedProjects>(`/projects${value ? `?${value}` : ''}`)
    .then((response) => response.data);
}

export function getProject(projectId: string | number) {
  return clientApi
    .get<Project>(`/projects/${projectId}`)
    .then((response) => response.data);
}

export function getProjectMembers(projectId: string | number) {
  return clientApi
    .get<ProjectMember[]>(`/projects/${projectId}/members`)
    .then((response) => response.data);
}

export function getProjectTasks(
  projectId: string | number,
  query: URLSearchParams,
) {
  return clientApi
    .get<PaginatedTasks>(`/projects/${projectId}/tasks?${query.toString()}`)
    .then((response) => response.data);
}

export function createProject(data: CreateProjectInput) {
  return clientApi
    .post<Project>('/projects', data)
    .then((response) => response.data);
}

export function updateProject(
  projectId: number,
  data: Partial<Pick<Project, 'name' | 'description' | 'status'>>,
) {
  return clientApi.patch<Project>(`/projects/${projectId}`, data);
}

export function deleteProject(projectId: number) {
  return clientApi.delete(`/projects/${projectId}`);
}

export function addProjectMember(projectId: number, userId: number) {
  return clientApi.post(`/projects/${projectId}/members`, { userId });
}

export function updateProjectMemberRole(
  projectId: number,
  userId: number,
  role: 'MANAGER' | 'MEMBER',
) {
  return clientApi.patch(`/projects/${projectId}/members/${userId}`, { role });
}

export function removeProjectMember(projectId: number, userId: number) {
  return clientApi.delete(`/projects/${projectId}/members/${userId}`);
}
