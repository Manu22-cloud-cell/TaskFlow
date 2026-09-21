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
      <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
        <p className="text-sm text-slate-600">Loading your workspace…</p>
      </main>
    );
  }

  return (
    <RealtimeNotificationProvider>
      <header className="border-b border-slate-200 bg-white">
        <nav className="mx-auto flex max-w-[1600px] items-center justify-between px-6 py-3 sm:px-10">
          <Link
            className="text-lg font-semibold text-indigo-700"
            href="/projects"
          >
            TaskFlow
          </Link>

          <div className="flex items-center gap-4">
            {user.role === 'ADMIN' && (
              <Link
                className="text-sm font-medium text-slate-600 hover:text-indigo-700"
                href="/admin/users"
              >
                Admin
              </Link>
            )}
            <div className="text-right text-sm">
              <p className="font-medium text-slate-800">{user.name}</p>
              <p className="text-xs text-slate-500">{formatRole(user.role)}</p>
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
