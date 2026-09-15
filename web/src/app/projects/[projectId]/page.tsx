import { notFound, redirect } from 'next/navigation';

import { CreateTaskForm } from './create-task-form';
import { ProjectMembersPanel } from './project-members-panel';
import { TaskBoard } from './task-board';
import { TaskFlowApiError, taskflowFetch } from '@/lib/taskflow-api';
import type {
  PaginatedTasks,
  Project,
  ProjectMember,
  Task,
  User,
  UserSummary,
} from '@/lib/types';

export default async function ProjectBoardPage(
  context: PageProps<'/projects/[projectId]'>,
) {
  const { projectId } = await context.params;
  let project: Project;
  let tasks: Task[];
  let currentUser: User;
  let projectMembers: ProjectMember[];
  let availableUsers: UserSummary[] = [];

  try {
    const [projectResponse, tasksResponse, userResponse, membersResponse] =
      await Promise.all([
        taskflowFetch<Project>(`/projects/${projectId}`),
        taskflowFetch<PaginatedTasks>(
          `/projects/${projectId}/tasks?page=1&limit=100`,
        ),
        taskflowFetch<User>('/auth/me'),
        taskflowFetch<ProjectMember[]>(`/projects/${projectId}/members`),
      ]);
    project = projectResponse;
    tasks = tasksResponse.data;
    currentUser = userResponse;
    projectMembers = membersResponse;

    if (currentUser.role !== 'MEMBER') {
      availableUsers = await taskflowFetch<UserSummary[]>('/users');
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

  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-10">
      <section className="mx-auto max-w-[1600px]">
        <header className="mb-8">
          <p className="text-sm font-medium text-indigo-600">Project board</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            {project.name}
          </h1>
          <p className="mt-2 text-slate-600">
            {project.description ?? 'No project description provided.'}
          </p>
          {canManageTasks && (
            <div className="mt-4">
              <CreateTaskForm members={projectMembers} projectId={project.id} />
            </div>
          )}
        </header>

        <TaskBoard
          canManageTasks={canManageTasks}
          currentUserId={currentUser.id}
          key={tasks
            .map((task) => `${task.id}-${task.status}-${task.position}`)
            .join(',')}
          tasks={tasks}
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
