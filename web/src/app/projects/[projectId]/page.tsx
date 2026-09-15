import { notFound, redirect } from 'next/navigation';

import { TaskCard } from './task-card';
import { TaskFlowApiError, taskflowFetch } from '@/lib/taskflow-api';
import type { PaginatedTasks, Project, Task, TaskStatus } from '@/lib/types';

const columns: { status: TaskStatus; title: string }[] = [
  { status: 'TODO', title: 'To do' },
  { status: 'IN_PROGRESS', title: 'In progress' },
  { status: 'COMPLETED', title: 'Completed' },
  { status: 'CANCELLED', title: 'Cancelled' },
];

export default async function ProjectBoardPage(
  context: PageProps<'/projects/[projectId]'>,
) {
  const { projectId } = await context.params;
  let project: Project;
  let tasks: Task[];

  try {
    const [projectResponse, tasksResponse] = await Promise.all([
      taskflowFetch<Project>(`/projects/${projectId}`),
      taskflowFetch<PaginatedTasks>(
        `/projects/${projectId}/tasks?page=1&limit=100`,
      ),
    ]);
    project = projectResponse;
    tasks = tasksResponse.data;
  } catch (error) {
    if (error instanceof TaskFlowApiError) {
      if (error.status === 401) redirect('/login');
      if (error.status === 404) notFound();
    }
    throw error;
  }

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
        </header>

        <div className="grid gap-4 lg:grid-cols-4">
          {columns.map((column) => {
            const columnTasks = tasks.filter(
              (task) => task.status === column.status,
            );
            return (
              <section
                className="rounded-xl bg-slate-200/70 p-3"
                key={column.status}
              >
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-semibold text-slate-700">
                    {column.title}
                  </h2>
                  <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-3">
                  {columnTasks.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 p-3 text-center text-sm text-slate-500">
                      No tasks
                    </p>
                  ) : (
                    columnTasks.map((task) => (
                      <TaskCard key={task.id} task={task} />
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
      </section>
    </main>
  );
}
