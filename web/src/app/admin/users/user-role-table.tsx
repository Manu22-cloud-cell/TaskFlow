'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { getClientApiError } from '@/lib/client-api';
import type { User, UserRole } from '@/lib/types';
import { updateUserRole } from '@/services/client/users.service';

export function UserRoleTable({
  users,
  currentUserId,
  onUpdated,
}: {
  users: User[];
  currentUserId: number;
  onUpdated?: () => void;
}) {
  const router = useRouter();
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateRole(userId: number, role: UserRole) {
    setError(null);
    setSavingUserId(userId);

    try {
      await updateUserRole(userId, role);
      onUpdated?.();
      router.refresh();
    } catch (error) {
      setError(getClientApiError(error, 'Unable to update the user role.'));
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <section className="panel mt-6 overflow-hidden">
      {error && (
        <p className="border-b border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                    className="form-control w-auto py-1.5 text-sm"
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
