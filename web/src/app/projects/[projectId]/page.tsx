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
} from '@/lib/types';
import { getCurrentUser } from '@/services/client/auth.service';
import {
  getProject,
  getProjectMembers,
  getProjectTasks,
} from '@/services/client/projects.service';

export default function ProjectBoardPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const searchParams = useSearchParams();
  const queryString = searchParams.toString();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [taskMeta, setTaskMeta] = useState<PaginatedTasks['meta'] | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [projectMembers, setProjectMembers] = useState<ProjectMember[]>([]);
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
    <main className="app-page">
      <section className="app-container max-w-[1600px]">
        <ProjectRealtimeListener
          currentUserId={currentUser.id}
          onRefresh={loadBoard}
          projectId={project.id}
        />
        <header className="mb-8 rounded-2xl border border-indigo-100 bg-white/80 p-5 shadow-sm sm:p-7">
          <p className="page-kicker">Project board</p>
          <h1 className="page-title">{project.name}</h1>
          <p className="page-description max-w-3xl">
            {project.description ?? 'No project description provided.'}
          </p>
          {canManageTasks && (
            <div className="mt-6 flex flex-wrap gap-3">
              <CreateTaskForm members={projectMembers} projectId={project.id} />
              <ProjectSettings canDelete={canDeleteProject} project={project} />
            </div>
          )}
        </header>

        <BoardFilters members={projectMembers} />

        <TaskBoard
          key={tasks
            .map((task) => `${task.id}-${task.status}-${task.position}`)
            .join(',')}
          tasks={tasks}
        />

        {tasks.length === 0 && (
          <p className="panel mt-6 border-dashed p-8 text-center text-sm text-slate-600">
            No tasks match the selected filters.
          </p>
        )}
        <BoardPagination
          page={taskMeta.page}
          total={taskMeta.total}
          totalPages={taskMeta.totalPages}
        />

        {canManageTasks && (
          <div className="mt-8 max-w-xl">
            <ProjectMembersPanel
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
    <main className="app-page flex min-h-screen items-center justify-center p-6">
      <p className="panel px-6 py-4 text-sm text-slate-600">{message}</p>
    </main>
  );
}
