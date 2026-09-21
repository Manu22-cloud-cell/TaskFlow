'use client';

import { useEffect, useState } from 'react';

import { refreshSession } from '@/services/client/auth.service';

function getSafeReturnTo(returnTo: string | undefined) {
  if (returnTo?.startsWith('/') && !returnTo.startsWith('//')) {
    return returnTo;
  }

  return '/projects';
}

export function RefreshSession({ returnTo }: { returnTo?: string }) {
  const [message, setMessage] = useState('Restoring your session…');

  useEffect(() => {
    async function restoreSession() {
      try {
        /*
         * This runs in the browser, so NestJS's Set-Cookie response headers
         * update the browser's HTTP-only cookies before the original page
         * is requested again.
         */
        await refreshSession();
        window.location.replace(getSafeReturnTo(returnTo));
      } catch {
        setMessage('Your session has expired. Redirecting to sign in…');
        window.setTimeout(() => window.location.replace('/login'), 600);
      }
    }

    void restoreSession();
  }, [returnTo]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-6">
      <p className="rounded-xl bg-white px-6 py-4 text-sm text-slate-700 shadow-sm">
        {message}
      </p>
    </main>
  );
}
