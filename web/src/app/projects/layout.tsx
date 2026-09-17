import Link from 'next/link';
import { redirect } from 'next/navigation';

import { LogoutButton } from './logout-button';
import { TaskFlowApiError, taskflowFetch } from '@/lib/taskflow-api';
import type { User } from '@/lib/types';

export default async function ProjectsLayout({
  children,
}: LayoutProps<'/projects'>) {
  let user: User;

  try {
    user = await taskflowFetch<User>('/auth/me');
  } catch (error) {
    if (error instanceof TaskFlowApiError && error.status === 401) {
      redirect('/login');
    }

    throw error;
  }

  return (
    <>
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3 sm:px-10">
          <Link
            className="text-lg font-semibold text-indigo-700"
            href="/projects"
          >
            TaskFlow
          </Link>

          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <p className="font-medium text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">{formatRole(user.role)}</p>
            </div>
            <LogoutButton />
          </div>
        </nav>
      </header>
      {children}
    </>
  );
}

function formatRole(role: User['role']) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
