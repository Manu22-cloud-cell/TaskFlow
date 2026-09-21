import { notFound, redirect } from 'next/navigation';

import { ProjectMembersPanel } from '@/features/projects/components/project-members-panel';
import { ProjectSettings } from '@/features/projects/components/project-settings';
import { ProjectRealtimeListener } from '@/features/realtime/components/project-realtime-listener';
import { BoardFilters } from '@/features/tasks/components/board-filters';
import { BoardPagination } from '@/features/tasks/components/board-pagination';
import { CreateTaskForm } from '@/features/tasks/components/create-task-form';
import { TaskBoard } from '@/features/tasks/components/task-board';
import { TaskFlowApiError } from '@/lib/taskflow-api';
import type {
  PaginatedTasks,
  Project,
  ProjectMember,
  Task,
  User,
  UserSummary,
} from '@/lib/types';
import { getCurrentUser } from '@/services/server/auth.service';
import {
  getProject,
  getProjectMembers,
  getProjectTasks,
} from '@/services/server/projects.service';
import { getUserSummaries } from '@/services/server/users.service';

export default async function ProjectBoardPage(
  context: PageProps<'/projects/[projectId]'>,
) {
  const { projectId } = await context.params;
  const searchParams = await context.searchParams;
  const requestedPage = Number(searchParams.page);
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const taskQuery = new URLSearchParams({ page: String(page), limit: '20' });

  for (const key of ['status', 'assignedToId', 'priority', 'dueDate']) {
    const value = searchParams[key];

    if (typeof value === 'string' && value) {
      taskQuery.set(key, value);
    }
  }
  let project: Project;
  let tasks: Task[];
  let taskMeta: PaginatedTasks['meta'];
  let currentUser: User;
  let projectMembers: ProjectMember[];
  let availableUsers: UserSummary[] = [];

  try {
    const [projectResponse, tasksResponse, userResponse, membersResponse] =
      await Promise.all([
        getProject(projectId),
        getProjectTasks(projectId, taskQuery),
        getCurrentUser(),
        getProjectMembers(projectId),
      ]);
    project = projectResponse;
    tasks = tasksResponse.data;
    taskMeta = tasksResponse.meta;
    currentUser = userResponse;
    projectMembers = membersResponse;

    if (currentUser.role !== 'MEMBER') {
      availableUsers = await getUserSummaries();
    }
  } catch (error) {
    if (error instanceof TaskFlowApiError) {
      if (error.status === 401) redirect('/login');
      if (error.status === 404) notFound();
    }
    throw error;
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
