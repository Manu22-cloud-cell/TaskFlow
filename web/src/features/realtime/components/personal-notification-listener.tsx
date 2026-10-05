'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { clientApi } from '@/lib/client-api';
import { useRealtimeNotificationStore } from '../stores/realtime-notification-store';

export function PersonalNotificationListener({ userId }: { userId: number }) {
  useEffect(() => {
    const url =
      process.env.NEXT_PUBLIC_TASKFLOW_SOCKET_URL ??
      process.env.NEXT_PUBLIC_TASKFLOW_API_URL;
    if (!url) return;
    const socket = io(`${url}/realtime`, {
      withCredentials: true,
      autoConnect: false,
    });
    let disposed = false;
    let retried = false;
    socket.on('realtime.ready', () => {
      retried = false;
    });
    socket.on('disconnect', async (reason) => {
      if (disposed || retried || reason !== 'io server disconnect') return;
      retried = true;
      try {
        await clientApi.get('/projects', { params: { limit: 1 } });
        if (!disposed) socket.connect();
      } catch {
        /* Authentication is handled by the shared API client. */
      }
    });
    // Keep the existing wire name for deployment compatibility. No system popup here.
    socket.on('notification.desktop', (event) => {
      if (
        !event ||
        event.userId !== userId ||
        event.actorId === userId ||
        typeof event.id !== 'string' ||
        typeof event.message !== 'string'
      )
        return;
      if (!/^\/(projects(?:\/\d+)?|tasks\/\d+)$/.test(event.href)) return;
      useRealtimeNotificationStore.getState().notify(event.message, {
        id: event.id,
        href: event.href,
        personal: true,
        showToast: document.visibilityState === 'visible',
      });
    });
    socket.connect();
    return () => {
      disposed = true;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [userId]);
  return null;
}
