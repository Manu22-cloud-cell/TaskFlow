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
    <article className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-semibold leading-snug text-slate-900">{task.title}</h3>
        <span
          className={`priority-pill priority-${task.priority.toLowerCase()}`}
        >
          {task.priority}
        </span>
      </div>
      {task.description && (
        <p className="mt-2 line-clamp-2 text-sm leading-5 text-slate-600">
          {task.description}
        </p>
      )}
      <p className="mt-4 border-t border-slate-100 pt-3 text-xs font-medium text-slate-500">
        {task.assignee ? `Assigned to ${task.assignee.name}` : 'Unassigned'}
      </p>
      {children}
      <Link
        className="mt-3 inline-block text-xs font-semibold text-indigo-600 hover:text-indigo-800"
        href={`/tasks/${task.id}`}
      >
        View details
      </Link>
    </article>
  );
}
