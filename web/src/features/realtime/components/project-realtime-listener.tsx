'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

const taskEvents = [
  'task.created',
  'task.updated',
  'task.moved',
  'task.deleted',
] as const;

export function ProjectRealtimeListener({ projectId }: { projectId: number }) {
  const router = useRouter();

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_TASKFLOW_API_URL;

    if (!apiUrl) return;

    const socket = io(`${apiUrl}/realtime`, {
      autoConnect: false,
      withCredentials: true,
    });
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    function refreshPage() {
      if (refreshTimer) clearTimeout(refreshTimer);

      refreshTimer = setTimeout(() => router.refresh(), 100);
    }

    socket.on('realtime.ready', () => {
      socket.emit('project.join', { projectId });
    });

    taskEvents.forEach((event) => socket.on(event, refreshPage));
    socket.connect();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);

      socket.disconnect();
    };
  }, [projectId, router]);

  return null;
}
