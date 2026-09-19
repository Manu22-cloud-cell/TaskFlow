import Link from 'next/link';

import type { ReactNode } from 'react';

import type { Task } from '@/lib/types';

export function TaskCard({
  task,
  children,
}: {
  task: Task;
  children?: ReactNode;
}) {
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
      {children}
      <Link
        className="mt-3 inline-block text-xs font-medium text-indigo-600 hover:text-indigo-800"
        href={`/tasks/${task.id}`}
      >
        View details
      </Link>
    </article>
  );
}
