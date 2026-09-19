'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getClientApiError } from '@/lib/client-api';
import type { ProjectStatus, User, UserSummary } from '@/lib/types';
import { createProject as createProjectRequest } from '@/services/client/projects.service';

const statuses: { value: ProjectStatus; label: string }[] = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export function CreateProjectForm({
  currentUser,
  owners,
}: {
  currentUser: User;
  owners: UserSummary[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<ProjectStatus>('PLANNING');
  const [ownerId, setOwnerId] = useState(String(currentUser.id));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isAdmin = currentUser.role === 'ADMIN';

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
        ...(isAdmin ? { ownerId: Number(ownerId) } : {}),
      });

      router.push(`/projects/${project.id}`);
      router.refresh();
    } catch (error) {
      setError(getClientApiError(error, 'Unable to create the project.'));
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Create project
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <form
        className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl"
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
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              onChange={(event) => setName(event.target.value)}
              placeholder="Website Redesign"
              required
              value={name}
            />
          </label>

          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Description
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="What is this project for?"
              value={description}
            />
          </label>

          <label className="text-sm font-medium text-slate-700">
            Initial status
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
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
            <label className="text-sm font-medium text-slate-700">
              Owner
              <select
                className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
                onChange={(event) => setOwnerId(event.target.value)}
                value={ownerId}
              >
                {owners.map((owner) => (
                  <option key={owner.id} value={owner.id}>
                    {owner.name} ({owner.email})
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving || !name.trim()}
          type="submit"
        >
          {isSaving ? 'Creating…' : 'Create project'}
        </button>
      </form>
    </div>
  );
}
