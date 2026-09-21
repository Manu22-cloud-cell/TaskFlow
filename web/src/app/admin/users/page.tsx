'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { UserRoleTable } from './user-role-table';
import { getClientApiError } from '@/lib/client-api';
import type { User } from '@/lib/types';
import { getCurrentUser } from '@/services/client/auth.service';
import { getUsers } from '@/services/client/users.service';

export default function AdminUsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUsers = useCallback(async () => {
    setError(null);

    try {
      const user = await getCurrentUser();

      if (user.role !== 'ADMIN') {
        router.replace('/projects');
        return;
      }

      const userList = await getUsers();
      setCurrentUser(user);
      setUsers(userList);
    } catch (error) {
      setError(getClientApiError(error, 'Unable to load users.'));
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadUsers);
  }, [loadUsers]);

  if (isLoading) return <AdminState message="Loading user management…" />;
  if (error || !currentUser) {
    return <AdminState message={error ?? 'Unable to load users.'} />;
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 sm:p-10">
      <section className="mx-auto max-w-5xl">
        <Link
          className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
          href="/projects"
        >
          ← Back to projects
        </Link>
        <p className="mt-6 text-sm font-medium text-indigo-600">
          Administration
        </p>
        <h1 className="mt-1 text-3xl font-semibold text-slate-900">
          User management
        </h1>
        <p className="mt-2 text-slate-600">
          Manage global roles. Project roles are managed inside each project.
        </p>
        <UserRoleTable
          currentUserId={currentUser.id}
          onUpdated={loadUsers}
          users={users}
        />
      </section>
    </main>
  );
}

function AdminState({ message }: { message: string }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <p className="rounded-xl bg-white px-6 py-4 text-sm text-slate-600 shadow-sm">
        {message}
      </p>
    </main>
  );
}
