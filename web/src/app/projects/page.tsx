'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { CreateProjectForm } from '@/features/projects/components/create-project-form';
import { ProjectFilters } from '@/features/projects/components/project-filters';
import { ProjectPagination } from '@/features/projects/components/project-pagination';
import { UserRealtimeListener } from '@/features/realtime/components/user-realtime-listener';
import { getClientApiError } from '@/lib/client-api';
import type {
  PaginatedProjects,
  Project,
  ProjectStatus,
  User,
} from '@/lib/types';
import { getCurrentUser } from '@/services/client/auth.service';
import { getProjects } from '@/services/client/projects.service';

const labels: Record<Project['status'], string> = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

function getProjectStatus(value: string | null) {
  return value && value in labels ? (value as ProjectStatus) : '';
}

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const searchName = searchParams.get('name')?.trim() ?? '';
  const selectedStatus = getProjectStatus(searchParams.get('status'));
  const requestedPage = Number(searchParams.get('page'));
  const page =
    Number.isInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectMeta, setProjectMeta] = useState<
    PaginatedProjects['meta'] | null
  >(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setError(null);

    try {
      const [projectResponse, userResponse] = await Promise.all([
        getProjects({
          search: searchName || undefined,
          status: selectedStatus || undefined,
          page,
          limit: 12,
        }),
        getCurrentUser(),
      ]);

      setProjects(projectResponse.data);
      setProjectMeta(projectResponse.meta);
      setCurrentUser(userResponse);
    } catch (error) {
      setError(getClientApiError(error, 'Unable to load projects.'));
    } finally {
      setIsLoading(false);
    }
  }, [page, searchName, selectedStatus]);

  useEffect(() => {
    void Promise.resolve().then(loadProjects);
  }, [loadProjects]);

  if (isLoading) return <ProjectsState message="Loading projects…" />;
  if (error || !currentUser || !projectMeta) {
    return <ProjectsState message={error ?? 'Unable to load projects.'} />;
  }

  const hasFilters = Boolean(searchName || selectedStatus);

  return (
    <main className="app-page">
      <section className="app-container max-w-6xl">
        <UserRealtimeListener
          currentUserId={currentUser.id}
          onRefresh={loadProjects}
        />
        <div className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="page-kicker">Your workspace</p>
            <h1 className="page-title">Projects</h1>
            <p className="page-description">Projects you own or belong to.</p>
          </div>
          {currentUser.role !== 'MEMBER' && (
            <CreateProjectForm
              currentUser={currentUser}
              onCreated={loadProjects}
            />
          )}
        </div>
        <ProjectFilters
          initialName={searchName}
          initialStatus={selectedStatus}
        />
        <p className="mb-4 text-sm font-medium text-slate-500">
          {hasFilters
            ? `Showing ${projects.length} of ${projectMeta.total} matching projects`
            : `${projectMeta.total} ${projectMeta.total === 1 ? 'project' : 'projects'}`}
        </p>
        {projectMeta.total === 0 ? (
          <div className="panel border-dashed p-10 text-center text-slate-600">
            {hasFilters
              ? 'No projects match your search or selected status.'
              : 'You do not have access to any projects yet.'}
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link
                className="group panel p-5 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
                href={`/projects/${project.id}`}
                key={project.id}
              >
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-semibold text-slate-900 transition group-hover:text-indigo-700">
                    {project.name}
                  </h2>
                  <span
                    className={`status-pill ${getStatusClass(project.status)}`}
                  >
                    {labels[project.status]}
                  </span>
                </div>
                <p className="mt-3 line-clamp-2 text-sm text-slate-600">
                  {project.description ?? 'No project description provided.'}
                </p>
                <p className="mt-4 text-xs text-slate-500">
                  Owner: {project.owner.name}
                </p>
              </Link>
            ))}
          </div>
        )}
        <ProjectPagination meta={projectMeta} />
      </section>
    </main>
  );
}

function ProjectsState({ message }: { message: string }) {
  return (
    <main className="app-page flex min-h-screen items-center justify-center p-6">
      <p className="panel px-6 py-4 text-sm text-slate-600">{message}</p>
    </main>
  );
}

function getStatusClass(status: ProjectStatus) {
  return `status-${status.toLowerCase()}`;
}
