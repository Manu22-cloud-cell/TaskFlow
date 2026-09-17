'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { clientApi } from '@/lib/client-api';

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);

    try {
      await clientApi.post('/auth/logout');
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <button
      className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={isLoggingOut}
      onClick={logout}
      type="button"
    >
      {isLoggingOut ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
