'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

const projectListEvents = [
  'project.member.added',
  'project.member.updated',
  'project.member.removed',
] as const;

export function UserRealtimeListener() {
  const router = useRouter();

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_TASKFLOW_API_URL;

    if (!apiUrl) return;

    const socket = io(`${apiUrl}/realtime`, {
      autoConnect: false,
      withCredentials: true,
    });
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    function refreshProjectList() {
      if (refreshTimer) clearTimeout(refreshTimer);

      refreshTimer = setTimeout(() => router.refresh(), 100);
    }

    projectListEvents.forEach((event) => socket.on(event, refreshProjectList));
    socket.connect();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);

      socket.disconnect();
    };
  }, [router]);

  return null;
}
