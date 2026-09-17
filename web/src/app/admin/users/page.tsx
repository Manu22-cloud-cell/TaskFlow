import Link from 'next/link';
import { redirect } from 'next/navigation';

import { UserRoleTable } from './user-role-table';
import { TaskFlowApiError, taskflowFetch } from '@/lib/taskflow-api';
import type { User } from '@/lib/types';

export default async function AdminUsersPage() {
  let currentUser: User;

  try {
    currentUser = await taskflowFetch<User>('/auth/me');
  } catch (error) {
    if (error instanceof TaskFlowApiError && error.status === 401)
      redirect('/login');
    throw error;
  }

  if (currentUser.role !== 'ADMIN') redirect('/projects');

  const users = await taskflowFetch<User[]>('/users');

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
        <UserRoleTable currentUserId={currentUser.id} users={users} />
      </section>
    </main>
  );
}
