'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getClientApiError } from '@/lib/client-api';
import type { ProjectMember, TaskPriority, TaskStatus } from '@/lib/types';
import { createTask as createTaskRequest } from '@/services/client/tasks.service';

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

export function CreateTaskForm({
  projectId,
  members,
}: {
  projectId: number;
  members: ProjectMember[];
}) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>('TODO');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [assignedToId, setAssignedToId] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim() || isSaving) return;

    setError(null);
    setIsSaving(true);

    try {
      await createTaskRequest({
        projectId,
        title: title.trim(),
        ...(description.trim() ? { description: description.trim() } : {}),
        status,
        priority,
        ...(assignedToId ? { assignedToId: Number(assignedToId) } : {}),
        ...(dueDate ? { dueDate } : {}),
      });

      setIsOpen(false);
      router.refresh();
    } catch (error) {
      setError(getClientApiError(error, 'Unable to create the task.'));
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
        Create task
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
      <form
        className="w-full max-w-xl rounded-xl bg-white p-5 shadow-xl"
        onSubmit={createTask}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-semibold text-slate-900">New task</h2>
            <p className="mt-1 text-sm text-slate-600">
              Add a task to this project board.
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
            Title
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Build project settings page"
              required
              value={title}
            />
          </label>

          <label className="text-sm font-medium text-slate-700 sm:col-span-2">
            Description
            <textarea
              className="mt-1 min-h-24 w-full rounded-md border border-slate-300 px-3 py-2 font-normal outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
          </label>

          <SelectField
            label="Status"
            onChange={setStatus}
            options={statuses}
            value={status}
          />
          <SelectField
            label="Priority"
            onChange={setPriority}
            options={priorities}
            value={priority}
          />

          <label className="text-sm font-medium text-slate-700">
            Assignee
            <select
              className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
              onChange={(event) => setAssignedToId(event.target.value)}
              value={assignedToId}
            >
              <option value="">Unassigned</option>
              {members.map((member) => (
                <option key={member.user.id} value={member.user.id}>
                  {member.user.name}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-medium text-slate-700">
            Due date
            <input
              className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2 font-normal"
              onChange={(event) => setDueDate(event.target.value)}
              type="date"
              value={dueDate}
            />
          </label>
        </div>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        <button
          className="mt-5 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={isSaving || !title.trim()}
          type="submit"
        >
          {isSaving ? 'Creating…' : 'Create task'}
        </button>
      </form>
    </div>
  );
}

function SelectField<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
}) {
  return (
    <label className="text-sm font-medium text-slate-700">
      {label}
      <select
        className="mt-1 w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-normal"
        onChange={(event) => onChange(event.target.value as T)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
