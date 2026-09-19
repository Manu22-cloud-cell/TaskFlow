'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { getClientApiError } from '@/lib/client-api';
import type { Project, ProjectStatus } from '@/lib/types';
import {
  deleteProject as deleteProjectRequest,
  updateProject,
} from '@/services/client/projects.service';

const statuses: { value: ProjectStatus; label: string }[] = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export function ProjectSettings({
  project,
  canDelete,
}: {
  project: Project;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description ?? '');
  const [status, setStatus] = useState<ProjectStatus>(project.status);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function saveProject() {
    if (!name.trim() || isSaving) return;

    setError(null);
    setIsSaving(true);

    try {
      await updateProject(project.id, {
        name: name.trim(),
        description: description.trim(),
        status,
      });
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setError(getClientApiError(error, 'Unable to update the project.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteProject() {
    if (
      isSaving ||
      !window.confirm(`Delete “${project.name}” and all of its tasks?`)
    ) {
      return;
    }

    setError(null);
    setIsSaving(true);

    try {
      await deleteProjectRequest(project.id);
      router.replace('/projects');
      router.refresh();
    } catch (error) {
      setError(getClientApiError(error, 'Unable to delete the project.'));
    } finally {
      setIsSaving(false);
    }
  }

  if (!isOpen) {
    return (
      <button
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        Project settings
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <section className="w-full max-w-xl rounded-xl bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Project settings
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Update project information.
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

        <div className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-slate-700">
            Project name
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
              onChange={(event) => setName(event.target.value)}
              value={name}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Description
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Status
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
              onChange={(event) =>
                setStatus(event.target.value as ProjectStatus)
              }
              value={status}
            >
              {statuses.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <div className="mt-6 flex items-center justify-between gap-3">
          {canDelete ? (
            <button
              className="text-sm font-medium text-red-600 hover:text-red-800 disabled:opacity-60"
              disabled={isSaving}
              onClick={deleteProject}
              type="button"
            >
              Delete project
            </button>
          ) : (
            <span />
          )}
          <button
            className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={isSaving || !name.trim()}
            onClick={saveProject}
            type="button"
          >
            {isSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </section>
    </div>
  );
}
