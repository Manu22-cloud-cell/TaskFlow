'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';

import { CreateProjectForm } from '@/features/projects/components/create-project-form';
import { ProjectFilters } from '@/features/projects/components/project-filters';
import { UserRealtimeListener } from '@/features/realtime/components/user-realtime-listener';
import { getClientApiError } from '@/lib/client-api';
import type { Project, ProjectStatus, User, UserSummary } from '@/lib/types';
import { getCurrentUser } from '@/services/client/auth.service';
import { getProjects } from '@/services/client/projects.service';
import { getUserSummaries } from '@/services/client/users.service';

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [owners, setOwners] = useState<UserSummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadProjects = useCallback(async () => {
    setError(null);

    try {
      const [projectResponse, userResponse] = await Promise.all([
        getProjects(),
        getCurrentUser(),
      ]);

      setProjects(projectResponse);
      setCurrentUser(userResponse);
      setOwners(userResponse.role === 'ADMIN' ? await getUserSummaries() : []);
    } catch (error) {
      setError(getClientApiError(error, 'Unable to load projects.'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadProjects);
  }, [loadProjects]);

  if (isLoading) return <ProjectsState message="Loading projects…" />;
  if (error || !currentUser) {
    return <ProjectsState message={error ?? 'Unable to load projects.'} />;
  }

  const matchingProjects = projects.filter((project) => {
    const matchesName = project.name
      .toLocaleLowerCase()
      .includes(searchName.toLocaleLowerCase());
    const matchesStatus = !selectedStatus || project.status === selectedStatus;

    return matchesName && matchesStatus;
  });
  const hasFilters = Boolean(searchName || selectedStatus);

  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-10">
      <section className="mx-auto max-w-6xl">
        <UserRealtimeListener
          currentUserId={currentUser.id}
          onRefresh={loadProjects}
        />
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-indigo-600">TaskFlow</p>
            <h1 className="mt-1 text-3xl font-semibold text-slate-900">
              Projects
            </h1>
            <p className="mt-2 text-slate-600">
              Projects you own or belong to.
            </p>
          </div>
          {currentUser.role !== 'MEMBER' && (
            <CreateProjectForm
              currentUser={currentUser}
              onCreated={loadProjects}
              owners={owners}
            />
          )}
        </div>
        <ProjectFilters
          initialName={searchName}
          initialStatus={selectedStatus}
        />
        <p className="mb-4 text-sm text-slate-600">
          {hasFilters
            ? `Showing ${matchingProjects.length} of ${projects.length} projects`
            : `${projects.length} ${projects.length === 1 ? 'project' : 'projects'}`}
        </p>
        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
            You do not have access to any projects yet.
          </div>
        ) : matchingProjects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-600">
            No projects match your search or selected status.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {matchingProjects.map((project) => (
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
                  {project.description ?? 'No project description provided.'}
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

function ProjectsState({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <p className="rounded-xl bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
        {message}
      </p>
    </main>
  );
}
