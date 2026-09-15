'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import type { ProjectMember, UserSummary } from '@/lib/types';

type ApiError = { message?: string };

export function ProjectMembersPanel({
  projectId,
  ownerId,
  members,
  availableUsers,
}: {
  projectId: number;
  ownerId: number;
  members: ProjectMember[];
  availableUsers: UserSummary[];
}) {
  const router = useRouter();
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memberIds = new Set(members.map((member) => member.user.id));
  const candidates = availableUsers.filter((user) => !memberIds.has(user.id));

  async function getError(response: Response) {
    const body = (await response.json().catch(() => null)) as ApiError | null;
    return body?.message ?? 'Unable to update project members.';
  }

  async function addMember() {
    if (!selectedUserId || isSaving) return;

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: Number(selectedUserId) }),
      });

      if (!response.ok) {
        setError(await getError(response));
        return;
      }

      setSelectedUserId('');
      router.refresh();
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  async function updateRole(userId: number, role: 'MANAGER' | 'MEMBER') {
    await changeMember(
      `/api/projects/${projectId}/members/${userId}`,
      'PATCH',
      {
        role,
      },
    );
  }

  async function removeMember(userId: number) {
    if (!window.confirm('Remove this user from the project?')) return;

    await changeMember(
      `/api/projects/${projectId}/members/${userId}`,
      'DELETE',
    );
  }

  async function changeMember(
    url: string,
    method: 'PATCH' | 'DELETE',
    body?: object,
  ) {
    if (isSaving) return;

    setError(null);
    setIsSaving(true);

    try {
      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        setError(await getError(response));
        return;
      }

      router.refresh();
    } catch {
      setError('Unable to reach the server. Please try again.');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl bg-white p-5 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">Project members</h2>

      {candidates.length > 0 && (
        <div className="mt-4 flex gap-2">
          <select
            className="min-w-0 flex-1 rounded-md border border-slate-300 bg-white px-3 py-2 text-sm"
            onChange={(event) => setSelectedUserId(event.target.value)}
            value={selectedUserId}
          >
            <option value="">Select a user to add</option>
            {candidates.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.email})
              </option>
            ))}
          </select>
          <button
            className="rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-60"
            disabled={isSaving || !selectedUserId}
            onClick={addMember}
            type="button"
          >
            Add
          </button>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      <ul className="mt-4 divide-y divide-slate-200">
        {members.map((member) => {
          const isOwner = member.user.id === ownerId;

          return (
            <li className="py-3" key={member.id}>
              <p className="text-sm font-medium text-slate-800">
                {member.user.name}
                {isOwner && (
                  <span className="ml-2 text-xs text-slate-500">Owner</span>
                )}
              </p>
              <p className="mt-0.5 text-xs text-slate-500">
                {member.user.email}
              </p>
              <div className="mt-2 flex items-center gap-3">
                <select
                  className="rounded border border-slate-300 bg-white px-2 py-1 text-xs"
                  disabled={isSaving || isOwner}
                  onChange={(event) =>
                    updateRole(
                      member.user.id,
                      event.target.value as 'MANAGER' | 'MEMBER',
                    )
                  }
                  value={member.role}
                >
                  <option value="MEMBER">Member</option>
                  <option value="MANAGER">Project manager</option>
                </select>
                {!isOwner && (
                  <button
                    className="text-xs font-medium text-red-600 hover:text-red-800"
                    disabled={isSaving}
                    onClick={() => removeMember(member.user.id)}
                    type="button"
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
