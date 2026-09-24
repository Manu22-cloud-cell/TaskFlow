'use client';

import Link from 'next/link';
import { useCallback, useDeferredValue, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { UserRoleTable } from './user-role-table';
import { getClientApiError } from '@/lib/client-api';
import type { PaginatedUsers, User } from '@/lib/types';
import { getCurrentUser } from '@/services/client/auth.service';
import { getUsers } from '@/services/client/users.service';

export default function AdminUsersPage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [meta, setMeta] = useState<PaginatedUsers['meta'] | null>(null);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
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

      const userList = await getUsers({
        search: deferredSearch.trim() || undefined,
        page,
        limit: 20,
      });
      setCurrentUser(user);
      setUsers(userList.data);
      setMeta(userList.meta);
    } catch (error) {
      setError(getClientApiError(error, 'Unable to load users.'));
    } finally {
      setIsLoading(false);
    }
  }, [deferredSearch, page, router]);

  useEffect(() => {
    void Promise.resolve().then(loadUsers);
  }, [loadUsers]);

  if (isLoading) return <AdminState message="Loading user management…" />;
  if (error || !currentUser || !meta) {
    return <AdminState message={error ?? 'Unable to load users.'} />;
  }

  return (
    <main className="app-page">
      <section className="app-container max-w-5xl">
        <Link
          className="text-sm font-semibold text-indigo-600 hover:text-indigo-800"
          href="/projects"
        >
          ← Back to projects
        </Link>
        <p className="page-kicker mt-8">Administration</p>
        <h1 className="page-title">User management</h1>
        <p className="page-description">
          Manage global roles. Project roles are managed inside each project.
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="w-full max-w-md text-sm font-medium text-slate-700">
            Search users
            <input
              className="form-control mt-1.5 font-normal"
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              placeholder="Search by name or email"
              value={search}
            />
          </label>
          <p className="text-sm text-slate-500">
            {meta.total} {meta.total === 1 ? 'user' : 'users'}
          </p>
        </div>
        <UserRoleTable
          currentUserId={currentUser.id}
          onUpdated={loadUsers}
          users={users}
        />
        {meta.total === 0 ? (
          <p className="panel mt-4 border-dashed p-6 text-center text-sm text-slate-600">
            No users match your search.
          </p>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-3 text-sm">
            <p className="text-slate-500">
              Page {meta.page} of {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                className="button-secondary px-3 py-1.5"
                disabled={meta.page === 1}
                onClick={() => setPage((currentPage) => currentPage - 1)}
                type="button"
              >
                Previous
              </button>
              <button
                className="button-secondary px-3 py-1.5"
                disabled={meta.page === meta.totalPages}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                type="button"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

function AdminState({ message }: { message: string }) {
  return (
    <main className="app-page flex min-h-screen items-center justify-center p-6">
      <p className="panel px-6 py-4 text-sm text-slate-600">{message}</p>
    </main>
  );
}
