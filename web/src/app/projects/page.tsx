import Link from 'next/link';
import { redirect } from 'next/navigation';
import { TaskFlowApiError, taskflowFetch } from '@/lib/taskflow-api';
import type { Project } from '@/lib/types';
const labels: Record<Project['status'], string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};
export default async function ProjectsPage() {
  let projects: Project[];
  try {
    projects = await taskflowFetch<Project[]>('/projects');
  } catch (error) {
    if (error instanceof TaskFlowApiError && error.status === 401)
      redirect('/login');
    throw error;
  }
  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-10">
      <section className="mx-auto max-w-6xl">
        <div className="mb-8">
          <p className="text-sm font-medium text-indigo-600">TaskFlow</p>
          <h1 className="mt-1 text-3xl font-semibold text-slate-900">
            Projects
          </h1>
          <p className="mt-2 text-slate-600">Projects you own or belong to.</p>
        </div>
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
            You do not have access to any projects yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                className="rounded-xl bg-white p-5 shadow-sm transition hover:shadow-md"
                href={`/projects/${project.id}`}
                key={project.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-slate-900">
                    {project.name}
                  </h2>
                  <span className="rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">
                    {labels[project.status]}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                  {project.description ?? 'No description provided.'}
                </p>
                <p className="mt-4 text-xs text-slate-500">
                  Owner: {project.owner.name}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
