'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { getClientApiError } from '@/lib/client-api';
import type { ProjectMember, UserSummary } from '@/lib/types';
import {
  addProjectMember,
  removeProjectMember,
  updateProjectMemberRole,
} from '@/services/client/projects.service';
import { getUserSummaries } from '@/services/client/users.service';

export function ProjectMembersPanel({
  projectId,
  ownerId,
  members,
}: {
  projectId: number;
  ownerId: number;
  members: ProjectMember[];
}) {
  const router = useRouter();
  const [userSearch, setUserSearch] = useState('');
  const [userOptions, setUserOptions] = useState<UserSummary[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSummary | null>(null);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const memberIds = new Set(members.map((member) => member.user.id));
  const candidates = userOptions.filter((user) => !memberIds.has(user.id));

  useEffect(() => {
    if (userSearch.trim().length < 2) {
      return;
    }

    let isActive = true;
    const timeout = window.setTimeout(async () => {
      setIsSearchingUsers(true);

      try {
        const users = await getUserSummaries({
          search: userSearch.trim(),
          limit: 10,
        });

        if (isActive) setUserOptions(users);
      } catch {
        if (isActive) setUserOptions([]);
      } finally {
        if (isActive) setIsSearchingUsers(false);
      }
    }, 250);

    return () => {
      isActive = false;
      window.clearTimeout(timeout);
    };
  }, [userSearch]);

  function updateUserSearch(value: string) {
    setUserSearch(value);

    if (value.trim().length < 2) {
      setUserOptions([]);
      setIsSearchingUsers(false);
    }
  }

  async function addMember() {
    if (!selectedUser || isSaving) return;

    setError(null);
    setIsSaving(true);

    try {
      await addProjectMember(projectId, selectedUser.id);

      setSelectedUser(null);
      setUserSearch('');
      setUserOptions([]);
      router.refresh();
    } catch (error) {
      setError(getClientApiError(error, 'Unable to add the project member.'));
    } finally {
      setIsSaving(false);
    }
  }

  async function updateRole(userId: number, role: 'MANAGER' | 'MEMBER') {
    await changeMember(userId, 'PATCH', role);
  }

  async function removeMember(userId: number) {
    if (!window.confirm('Remove this user from the project?')) return;

    await changeMember(userId, 'DELETE');
  }

  async function changeMember(
    userId: number,
    method: 'PATCH' | 'DELETE',
    role?: 'MANAGER' | 'MEMBER',
  ) {
    if (isSaving) return;

    setError(null);
    setIsSaving(true);

    try {
      if (method === 'PATCH') {
        await updateProjectMemberRole(projectId, userId, role!);
      } else {
        await removeProjectMember(projectId, userId);
      }

      router.refresh();
    } catch (error) {
      setError(getClientApiError(error, 'Unable to update project members.'));
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="panel p-5 sm:p-6">
      <h2 className="text-lg font-semibold text-slate-900">Project members</h2>

      <div className="mt-4">
        <label
          className="text-sm font-medium text-slate-700"
          htmlFor="member-search"
        >
          Add a member
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            className="form-control min-w-0 flex-1 text-sm"
            id="member-search"
            onChange={(event) => updateUserSearch(event.target.value)}
            placeholder="Search by name or email"
            value={userSearch}
          />
          <button
            className="button-primary px-3"
            disabled={isSaving || !selectedUser}
            onClick={addMember}
            type="button"
          >
            Add
          </button>
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Type at least two characters to find users.
        </p>
        {selectedUser && (
          <p className="mt-2 text-xs text-slate-600">
            Selected: {selectedUser.name} ({selectedUser.email})
          </p>
        )}
        {isSearchingUsers && (
          <p className="mt-2 text-xs text-slate-500">Searching…</p>
        )}
        {candidates.length > 0 && (
          <ul className="mt-2 max-h-32 rounded-lg border border-slate-200 p-1">
            {candidates.map((user) => (
              <li key={user.id}>
                <button
                  className="w-full rounded px-2 py-1.5 text-left text-xs hover:bg-indigo-50 hover:text-indigo-800"
                  onClick={() => {
                    setSelectedUser(user);
                    setUserSearch('');
                    setUserOptions([]);
                  }}
                  type="button"
                >
                  {user.name} ({user.email})
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

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
