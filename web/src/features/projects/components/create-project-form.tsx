'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getClientApiError } from '@/lib/client-api';
import type { ProjectStatus, User, UserSummary } from '@/lib/types';
import { createProject as createProjectRequest } from '@/services/client/projects.service';
import { getUserSummaries } from '@/services/client/users.service';

const statuses: { value: ProjectStatus; label: string }[] = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export function CreateProjectForm({
  currentUser,
  onCreated,
}: {
  currentUser: User;
  onCreated?: () => void;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNING');
  const [ownerSearch, setOwnerSearch] = useState('');
  const [ownerOptions, setOwnerOptions] = useState<UserSummary[]>([]);
  const [selectedOwner, setSelectedOwner] = useState<UserSummary>({
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
  });
  const [isSearchingOwners, setIsSearchingOwners] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = currentUser.role === 'ADMIN';

  useEffect(() => {
    if (!isOpen || !isAdmin || ownerSearch.trim().length < 2) {
      return;
    }

    let isActive = true;
    const timeout = window.setTimeout(async () => {
      setIsSearchingOwners(true);

      try {
        const users = await getUserSummaries({
          search: ownerSearch.trim(),
          limit: 10,
        });

        if (isActive) setOwnerOptions(users);
      } catch {
        if (isActive) setOwnerOptions([]);
      } finally {
        if (isActive) setIsSearchingOwners(false);
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
    };
  }, [isAdmin, isOpen, ownerSearch]);

  function updateOwnerSearch(value: string) {
    setOwnerSearch(value);

    if (value.trim().length < 2) {
      setOwnerOptions([]);
      setIsSearchingOwners(false);
    }
  }

  async function createProject(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!name.trim() || isSaving) return;

    setError(null);
    setIsSaving(true);

    try {
      const project = await createProjectRequest({
        name: name.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        status,
        ...(isAdmin ? { ownerId: selectedOwner.id } : {}),
      });

      onCreated?.();
      router.push(`/projects/${project.id}`);
    } catch (error) {
      setError(getClientApiError(error, 'Unable to create the project.'));
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        className="button-primary"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Create project
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm">
      <form
        className="panel w-full max-w-xl p-6 shadow-2xl"
        onSubmit={createProject}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">New project</h2>
            <p className="mt-1 text-sm text-slate-600">
              {isAdmin
                ? 'Choose the user who will own and manage this project.'
                : 'You will become this project’s owner and manager.'}
            </p>
          </div>
          <button
            className="text-sm text-slate-500 hover:text-slate-800"
            disabled={isSaving}
            onClick={() => setIsOpen(false)}
            type="button"
          >
            Cancel
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Project name
            <input
              className="form-control mt-1.5 font-normal"
              onChange={(event) => setName(event.target.value)}
              placeholder="Website Redesign"
              required
              value={name}
            />
          </label>

          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Description
            <textarea
              className="form-control mt-1.5 min-h-24 font-normal"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this project for?"
              value={description}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Initial status
            <select
              className="form-control mt-1.5 font-normal"
              onChange={(event) =>
                setStatus(event.target.value as ProjectStatus)
              }
              value={status}
            >
              {statuses.map((projectStatus) => (
                <option key={projectStatus.value} value={projectStatus.value}>
                  {projectStatus.label}
                </option>
              ))}
            </select>
          </label>

          {isAdmin && (
            <div className="text-sm font-medium text-slate-700">
              <label htmlFor="project-owner-search">Project owner</label>
              <input
                className="form-control mt-1.5 font-normal"
                id="project-owner-search"
                onChange={(event) => updateOwnerSearch(event.target.value)}
                placeholder="Search by name or email"
                value={ownerSearch}
              />
              <p className="mt-1 text-xs font-normal text-slate-500">
                Type at least two characters to find an owner.
              </p>

              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 p-2 font-normal">
                <p className="text-xs text-slate-600">
                  Selected: {selectedOwner.name} ({selectedOwner.email})
                </p>
                {isSearchingOwners && (
                  <p className="mt-2 text-xs text-slate-500">Searching…</p>
                )}
                {ownerOptions.length > 0 && (
                  <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                    {ownerOptions.map((owner) => (
                      <li key={owner.id}>
                        <button
                          className="w-full rounded px-2 py-1 text-left text-xs hover:bg-indigo-50 hover:text-indigo-800"
                          onClick={() => {
                            setSelectedOwner(owner);
                            setOwnerSearch('');
                            setOwnerOptions([]);
                          }}
                          type="button"
                        >
                          {owner.name} ({owner.email})
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          className="button-primary mt-5"
          disabled={isSaving || !name.trim()}
          type="submit"
        >
          {isSaving ? 'Creating…' : 'Create project'}
        </button>
      </form>
    </div>
  );
}
