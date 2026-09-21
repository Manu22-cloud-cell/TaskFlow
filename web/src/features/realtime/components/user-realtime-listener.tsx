'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

import {
  getRealtimeNotificationMessage,
  type RealtimeEventPayload,
  useRealtimeNotifications,
} from './realtime-notification-provider';

const projectListEvents = [
  'project.member.added',
  'project.member.updated',
  'project.member.removed',
] as const;

export function UserRealtimeListener({
  currentUserId,
  onRefresh,
}: {
  currentUserId: number;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const { notify } = useRealtimeNotifications();

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

      refreshTimer = setTimeout(() => {
        if (onRefresh) {
          onRefresh();
        } else {
          router.refresh();
        }
      }, 100);
    }

    function handleProjectListEvent(
      event: string,
      payload: RealtimeEventPayload = {},
    ) {
      refreshProjectList();

      if (payload.actorId !== currentUserId) {
        notify(getRealtimeNotificationMessage(event, payload, currentUserId));
      }
    }

    projectListEvents.forEach((event) =>
      socket.on(event, (payload) => handleProjectListEvent(event, payload)),
    );
    socket.connect();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);

      socket.disconnect();
    };
  }, [currentUserId, notify, onRefresh, router]);

  return null;
}
