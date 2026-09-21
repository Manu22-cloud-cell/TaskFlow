'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { logout as logoutRequest } from '@/services/client/auth.service';

export function LogoutButton() {
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function logout() {
    setIsLoggingOut(true);

    try {
      await logoutRequest();
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <button
      className="button-secondary min-h-9 px-3 py-1.5"
      disabled={isLoggingOut}
      onClick={logout}
      type="button"
    >
      {isLoggingOut ? 'Signing out…' : 'Sign out'}
    </button>
  );
}
