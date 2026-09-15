'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import type { Task, TaskStatus } from '@/lib/types';

const statusLabels: Record<TaskStatus, string> = {
  TODO: 'To do',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export function TaskCard({ task }: { task: Task }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function updateStatus(status: TaskStatus) {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/tasks/${task.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        const data = (await response.json()) as { message?: string };
        setError(data.message ?? 'Unable to update task status');
        return;
      }

      router.refresh();
    });
  }

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-medium text-slate-900">{task.title}</h3>
        <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
          {task.priority}
        </span>
      </div>
      {task.description && (
        <p className="mt-2 text-sm text-slate-600">{task.description}</p>
      )}
      <p className="mt-3 text-xs text-slate-500">
        {task.assignee ? `Assigned to ${task.assignee.name}` : 'Unassigned'}
      </p>
      <label className="mt-3 block text-xs font-medium text-slate-600">
        Status
        <select
          className="mt-1 w-full rounded border border-slate-300 bg-white px-2 py-1 text-sm"
          defaultValue={task.status}
          disabled={isPending}
          onChange={(event) => updateStatus(event.target.value as TaskStatus)}
        >
          {Object.entries(statusLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </article>
  );
}
