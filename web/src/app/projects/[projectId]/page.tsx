'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';

import { ProjectMembersPanel } from '@/features/projects/components/project-members-panel';
import { ProjectSettings } from '@/features/projects/components/project-settings';
import { ProjectRealtimeListener } from '@/features/realtime/components/project-realtime-listener';
import { BoardFilters } from '@/features/tasks/components/board-filters';
import { BoardPagination } from '@/features/tasks/components/board-pagination';
import { CreateTaskForm } from '@/features/tasks/components/create-task-form';
import { TaskBoard } from '@/features/tasks/components/task-board';
import { getClientApiError } from '@/lib/client-api';
import type {
  PaginatedTasks,
  Project,
  ProjectMember,
  Task,
  User,
  UserSummary,
} from '@/lib/types';
import { getCurrentUser } from '@/services/client/auth.service';
import {
  getProject,
  getProjectMembers,
  getProjectTasks,
} from '@/services/client/projects.service';
import { getUserSummaries } from '@/services/client/users.service';

export default function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskMeta, setTaskMeta] = useState<PaginatedTasks['meta'] | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadBoard = useCallback(async () => {
    const currentQuery = new URLSearchParams(queryString);
    const requestedPage = Number(currentQuery.get('page'));
    const page =
      Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
    const taskQuery = new URLSearchParams({ page: String(page), limit: '20' });

    for (const key of ['status', 'assignedToId', 'priority', 'dueDate']) {
      const value = currentQuery.get(key);

      if (value) taskQuery.set(key, value);
    }

    setError(null);
    setIsLoading(true);

    try {
      const [projectResponse, tasksResponse, userResponse, membersResponse] =
        await Promise.all([
          getProject(projectId),
          getProjectTasks(projectId, taskQuery),
          getCurrentUser(),
          getProjectMembers(projectId),
        ]);

      setProject(projectResponse);
      setTasks(tasksResponse.data);
      setTaskMeta(tasksResponse.meta);
      setCurrentUser(userResponse);
      setProjectMembers(membersResponse);
      setAvailableUsers(
        userResponse.role === 'MEMBER' ? [] : await getUserSummaries(),
      );
    } catch (error) {
      setError(getClientApiError(error, 'Unable to load this project.'));
    } finally {
      setIsLoading(false);
    }
  }, [projectId, queryString]);

  useEffect(() => {
    void Promise.resolve().then(loadBoard);
  }, [loadBoard]);

  if (isLoading) return <BoardState message="Loading project board…" />;
  if (error || !project || !taskMeta || !currentUser) {
    return <BoardState message={error ?? 'Project not found.'} />;
  }

  const canManageTasks =
    currentUser.role === 'ADMIN' ||
    project.ownerId === currentUser.id ||
    projectMembers.some(
      (member) =>
        member.user.id === currentUser.id && member.role === 'MANAGER',
    );
  const canDeleteProject =
    currentUser.role === 'ADMIN' || project.ownerId === currentUser.id;

  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-10">
      <section className="mx-auto max-w-[1600px]">
        <ProjectRealtimeListener
          currentUserId={currentUser.id}
          onRefresh={loadBoard}
          projectId={project.id}
        />
        <header className="mb-8">
          <p className="text-sm font-medium text-indigo-600">Project board</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            {project.name}
          </h1>
          <p className="mt-2 text-slate-600">
            {project.description ?? 'No project description provided.'}
          </p>
          {canManageTasks && (
            <div className="mt-4 flex flex-wrap gap-3">
              <CreateTaskForm members={projectMembers} projectId={project.id} />
              <ProjectSettings canDelete={canDeleteProject} project={project} />
            </div>
          )}
        </header>

        <BoardFilters members={projectMembers} />

        <TaskBoard
          canManageTasks={canManageTasks}
          currentUserId={currentUser.id}
          key={tasks
            .map((task) => `${task.id}-${task.status}-${task.position}`)
            .join(',')}
          tasks={tasks}
        />

        {tasks.length === 0 && (
          <p className="mt-6 rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-600">
            No tasks match the selected filters.
          </p>
        )}
        <BoardPagination
          page={taskMeta.page}
          total={taskMeta.total}
          totalPages={taskMeta.totalPages}
        />

        {canManageTasks && (
          <div className="mt-6 max-w-xl">
            <ProjectMembersPanel
              availableUsers={availableUsers}
              members={projectMembers}
              ownerId={project.ownerId}
              projectId={project.id}
            />
          </div>
        )}
      </section>
    </main>
  );
}

function BoardState({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <p className="rounded-xl bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
        {message}
      </p>
    </main>
  );
}
