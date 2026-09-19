'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import type { ProjectMember, TaskPriority, TaskStatus } from '@/lib/types';

const statuses: { value: TaskStatus; label: string }[] = [
  { value: 'TODO', label: 'To do' },
  { value: 'IN_PROGRESS', label: 'In progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const priorities: { value: TaskPriority; label: string }[] = [
  { value: 'LOW', label: 'Low' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HIGH', label: 'High' },
];

export function BoardFilters({ members }: { members: ProjectMember[] }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function updateFilter(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());

    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }

    params.delete('page');

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function clearFilters() {
    router.push(pathname);
  }

  const hasFilters = ['status', 'assignedToId', 'priority', 'dueDate'].some(
    (filter) => searchParams.has(filter),
  );

  return (
    <section className="mb-6 rounded-xl bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-end gap-3">
        <FilterSelect
          label="Status"
          onChange={(value) => updateFilter('status', value)}
          options={statuses}
          value={searchParams.get('status') ?? ''}
        />
        <FilterSelect
          label="Assignee"
          onChange={(value) => updateFilter('assignedToId', value)}
          options={members.map((member) => ({
            value: String(member.user.id),
            label: member.user.name,
          }))}
          value={searchParams.get('assignedToId') ?? ''}
        />
        <FilterSelect
          label="Priority"
          onChange={(value) => updateFilter('priority', value)}
          options={priorities}
          value={searchParams.get('priority') ?? ''}
        />
        <label className="text-sm font-medium text-slate-700">
          Due date
          <input
            className="mt-1 block rounded-md border border-slate-300 px-3 py-2 text-sm font-normal"
            onChange={(event) => updateFilter('dueDate', event.target.value)}
            type="date"
            value={searchParams.get('dueDate') ?? ''}
          />
        </label>
        {hasFilters && (
          <button
            className="pb-2 text-sm font-medium text-indigo-600 hover:text-indigo-800"
            onClick={clearFilters}
            type="button"
          >
            Clear filters
          </button>
        )}
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select
        className="mt-1 block rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-normal"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
