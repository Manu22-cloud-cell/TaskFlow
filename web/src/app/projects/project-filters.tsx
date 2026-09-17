'use client';

import { FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { ProjectStatus } from '@/lib/types';

const statuses: { value: ProjectStatus; label: string }[] = [
  { value: 'PLANNING', label: 'Planning' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

type ProjectFiltersProps = {
  initialName: string;
  initialStatus: ProjectStatus | '';
};

export function ProjectFilters({
  initialName,
  initialStatus,
}: ProjectFiltersProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const hasFilters = Boolean(initialName || initialStatus);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get('name') ?? '').trim();
    const status = String(formData.get('status') ?? '');
    const params = new URLSearchParams(searchParams.toString());

    if (name) params.set('name', name);
    else params.delete('name');

    if (status) params.set('status', status);
    else params.delete('status');

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function clearFilters() {
    router.push(pathname);
  }

  return (
    <form
      className="mb-6 flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-end"
      key={`${initialName}-${initialStatus}`}
      onSubmit={applyFilters}
    >
      <label className="flex-1 text-sm font-medium text-slate-700">
        Search projects
        <input
          className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
          defaultValue={initialName}
          name="name"
          placeholder="Search by project name"
          type="search"
        />
      </label>

      <label className="text-sm font-medium text-slate-700">
        Status
        <select
          className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal sm:w-40"
          defaultValue={initialStatus}
          name="status"
        >
          <option value="">All statuses</option>
          {statuses.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>
      </label>

      <div className="flex gap-2">
        <button
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          type="submit"
        >
          Apply
        </button>
        {hasFilters && (
          <button
            className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            onClick={clearFilters}
            type="button"
          >
            Clear
          </button>
        )}
      </div>
    </form>
  );
}
