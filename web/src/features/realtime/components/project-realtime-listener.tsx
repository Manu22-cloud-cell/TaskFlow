'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';

import {
  getRealtimeNotificationMessage,
  type RealtimeEventPayload,
} from '../realtime-notification-message';
import { useRealtimeNotificationStore } from '../stores/realtime-notification-store';

const taskEvents = [
  'task.created',
  'task.updated',
  'task.moved',
  'task.deleted',
] as const;

const commentEvents = [
  'comment.created',
  'comment.updated',
  'comment.deleted',
] as const;

const projectEvents = ['project.updated'] as const;

const projectMemberEvents = [
  'project.member.added',
  'project.member.updated',
] as const;

export function ProjectRealtimeListener({
  projectId,
  currentUserId,
  includeCommentEvents = false,
  onRefresh,
}: {
  projectId: number;
  currentUserId: number;
  includeCommentEvents?: boolean;
  onRefresh?: () => void;
}) {
  const router = useRouter();
  const notify = useRealtimeNotificationStore((state) => state.notify);

  useEffect(() => {
    const apiUrl = process.env.NEXT_PUBLIC_TASKFLOW_API_URL;
    const socketUrl = process.env.NEXT_PUBLIC_TASKFLOW_SOCKET_URL ?? apiUrl;

    if (!socketUrl) return;

    const socket = io(`${socketUrl}/realtime`, {
      autoConnect: false,
      withCredentials: true,
    });
    let refreshTimer: ReturnType<typeof setTimeout> | undefined;

    function refreshPage() {
      if (refreshTimer) clearTimeout(refreshTimer);

      refreshTimer = setTimeout(() => {
        if (onRefresh) {
          onRefresh();
        } else {
          router.refresh();
        }
      }, 100);
    }

    function handleRealtimeEvent(
      event: string,
      payload: RealtimeEventPayload = {},
    ) {
      refreshPage();

      if (payload.actorId !== currentUserId) {
        notify(getRealtimeNotificationMessage(event, payload, currentUserId), {
          id: payload.id,
        });
      }
    }

    function leaveDeletedProject(payload: RealtimeEventPayload = {}) {
      if (payload.actorId !== currentUserId) {
        notify(
          getRealtimeNotificationMessage(
            'project.deleted',
            payload,
            currentUserId,
          ),
          { id: payload.id },
        );
      }

      router.replace('/projects');
    }

    function handleMemberRemoved(payload: RealtimeEventPayload = {}) {
      if (payload.actorId !== currentUserId) {
        notify(
          getRealtimeNotificationMessage(
            'project.member.removed',
            payload,
            currentUserId,
          ),
          { id: payload.id },
        );
      }

      if (payload.userId === currentUserId) {
        router.replace('/projects');
        return;
      }

      refreshPage();
    }

    socket.on('realtime.ready', () => {
      socket.emit('project.join', { projectId });
    });

    taskEvents.forEach((event) =>
      socket.on(event, (payload) => handleRealtimeEvent(event, payload)),
    );
    if (includeCommentEvents) {
      commentEvents.forEach((event) =>
        socket.on(event, (payload) => handleRealtimeEvent(event, payload)),
      );
    }
    projectEvents.forEach((event) =>
      socket.on(event, (payload) => handleRealtimeEvent(event, payload)),
    );
    projectMemberEvents.forEach((event) =>
      socket.on(event, (payload) => handleRealtimeEvent(event, payload)),
    );
    socket.on('project.deleted', leaveDeletedProject);
    socket.on('project.member.removed', handleMemberRemoved);
    socket.connect();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);

      socket.disconnect();
    };
  }, [
    currentUserId,
    includeCommentEvents,
    notify,
    onRefresh,
    projectId,
    router,
  ]);

  return null;
}
