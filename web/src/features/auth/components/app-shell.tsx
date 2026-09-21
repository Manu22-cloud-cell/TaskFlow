'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';

import type { User } from '@/lib/types';
import { getCurrentUser } from '@/services/client/auth.service';
import { RealtimeNotificationProvider } from '@/features/realtime/components/realtime-notification-provider';

import { LogoutButton } from './logout-button';

export function AppShell({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    void getCurrentUser()
      .then(setUser)
      .catch(() => undefined);
  }, []);

  if (!user) {
    return (
      <main className="app-page flex min-h-screen items-center justify-center p-6">
        <p className="panel px-5 py-3 text-sm text-slate-600">
          Loading your workspace…
        </p>
      </main>
    );
  }

  return (
    <RealtimeNotificationProvider>
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-5 py-3 sm:px-8">
          <Link
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900"
            href="/projects"
          >
            <span className="grid size-8 place-items-center rounded-lg bg-indigo-600 text-sm text-white shadow-sm">
              T
            </span>
            TaskFlow
          </Link>

          <div className="flex items-center gap-3 sm:gap-5">
            {user.role === 'ADMIN' && (
              <Link
                className="hidden text-sm font-semibold text-slate-600 transition hover:text-indigo-700 sm:block"
                href="/admin/users"
              >
                Admin
              </Link>
            )}
            <div className="hidden text-right text-sm sm:block">
              <p className="font-semibold text-slate-800">{user.name}</p>
              <p className="text-xs font-medium text-slate-500">
                {formatRole(user.role)}
              </p>
            </div>
            <LogoutButton />
          </div>
        </nav>
      </header>
      {children}
    </RealtimeNotificationProvider>
  );
}

function formatRole(role: User['role']) {
  return role.charAt(0) + role.slice(1).toLowerCase();
}
