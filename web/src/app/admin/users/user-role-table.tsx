'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { clientApi, getClientApiError } from '@/lib/client-api';
import type { User, UserRole } from '@/lib/types';

export function UserRoleTable({
  users,
  currentUserId,
}: {
  users: User[];
  currentUserId: number;
}) {
  const router = useRouter();
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateRole(userId: number, role: UserRole) {
    setError(null);
    setSavingUserId(userId);

    try {
      await clientApi.patch(`/users/${userId}`, { role });
      router.refresh();
    } catch (error) {
      setError(getClientApiError(error, 'Unable to update the user role.'));
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <section className="mt-6 overflow-hidden rounded-xl bg-white shadow-sm">
      {error && (
        <p className="border-b border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">User</th>
              <th className="px-5 py-3">Email</th>
              <th className="px-5 py-3">Global role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-5 py-3 font-medium text-slate-800">
                  {user.name}
                </td>
                <td className="px-5 py-3 text-slate-600">{user.email}</td>
                <td className="px-5 py-3">
                  <select
                    className="rounded border border-slate-300 bg-white px-2 py-1"
                    disabled={
                      savingUserId === user.id || user.id === currentUserId
                    }
                    onChange={(event) =>
                      updateRole(user.id, event.target.value as UserRole)
                    }
                    value={user.role}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="MANAGER">Manager</option>
                    <option value="ADMIN">Admin</option>
                  </select>
                  {user.id === currentUserId && (
                    <span className="ml-2 text-xs text-slate-500">
                      Your account
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
