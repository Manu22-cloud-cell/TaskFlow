import { clientApi } from '@/lib/client-api';
import type { Project, ProjectStatus } from '@/lib/types';

export type CreateProjectInput = {
  name: string;
  description?: string;
  status: ProjectStatus;
  ownerId?: number;
};

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
