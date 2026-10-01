'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { logout as logoutRequest } from '@/services/client/auth.service';

import { useSession } from './session-provider';

export function LogoutButton() {
  const router = useRouter();
  const { clearUser } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);

    try {
      await logoutRequest();
    } finally {
      clearUser();
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <button
      className="button-danger min-h-9 px-3 py-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600"
      disabled={isLoggingOut}
      onClick={logout}
      type="button"
    >
      {isLoggingOut ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
