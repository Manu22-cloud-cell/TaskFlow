'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { ProjectMember, Task, TaskPriority } from '@/lib/types';
export function TaskActions({
  task,
  members,
}: {
  task: Task;
  members: ProjectMember[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState(task.title);
  const [description, setDescription] = useState(task.description ?? '');
  const [priority, setPriority] = useState<TaskPriority>(task.priority);
  const [assignedToId, setAssignedToId] = useState(
    String(task.assignedToId ?? ''),
  );
  const [dueDate, setDueDate] = useState(task.dueDate?.slice(0, 10) ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save() {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description: description.trim() || null,
          priority,
          assignedToId: assignedToId ? Number(assignedToId) : null,
          dueDate: dueDate || null,
        }),
      });
      if (!response.ok) {
        setError((await response.json()).message ?? 'Unable to update task.');
        return;
      }
      router.refresh();
    } catch {
      setError('Unable to reach the server.');
    } finally {
      setSaving(false);
    }
  }
  async function remove() {
    if (!window.confirm('Delete this task?')) return;
    setSaving(true);
    const response = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
    if (response.ok) router.push(`/projects/${task.projectId}`);
    else {
      setError((await response.json()).message ?? 'Unable to delete task.');
      setSaving(false);
    }
  }
  return (
    <section className="mt-6 rounded-xl border border-slate-200 p-5">
      <h2 className="font-semibold text-slate-900">Manage task</h2>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="text-sm">
          Title
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
            onChange={(event) => setTitle(event.target.value)}
            value={title}
          />
        </label>
        <label className="text-sm">
          Priority
          <select
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
            onChange={(event) =>
              setPriority(event.target.value as TaskPriority)
            }
            value={priority}
          >
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>
        </label>
        <label className="text-sm">
          Assignee
          <select
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
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
        <label className="text-sm sm:col-span-2">
          Description
          <textarea
            className="mt-1 min-h-24 w-full rounded border border-slate-300 px-2 py-1"
            onChange={(event) => setDescription(event.target.value)}
            value={description}
          />
        </label>
        <label className="text-sm">
          Due date
          <input
            className="mt-1 w-full rounded border border-slate-300 px-2 py-1"
            onChange={(event) => setDueDate(event.target.value)}
            type="date"
            value={dueDate}
          />
        </label>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      <div className="mt-4 flex gap-3">
        <button
          className="rounded bg-indigo-600 px-3 py-2 text-sm text-white disabled:opacity-60"
          disabled={saving || !title.trim()}
          onClick={save}
          type="button"
        >
          Save changes
        </button>
        <button
          className="rounded px-3 py-2 text-sm text-red-600"
          disabled={saving}
          onClick={remove}
          type="button"
        >
          Delete task
        </button>
      </div>
    </section>
  );
}
