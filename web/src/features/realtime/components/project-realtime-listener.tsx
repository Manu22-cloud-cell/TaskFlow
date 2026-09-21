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
}: {
  projectId: number;
  currentUserId: number;
  includeCommentEvents?: boolean;
}) {
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

    function leaveDeletedProject() {
      router.replace('/projects');
    }

    function handleMemberRemoved(payload: { userId?: number }) {
      if (payload.userId === currentUserId) {
        router.replace('/projects');
        return;
      }

      refreshPage();
    }

    socket.on('realtime.ready', () => {
      socket.emit('project.join', { projectId });
    });

    taskEvents.forEach((event) => socket.on(event, refreshPage));
    if (includeCommentEvents) {
      commentEvents.forEach((event) => socket.on(event, refreshPage));
    }
    projectEvents.forEach((event) => socket.on(event, refreshPage));
    projectMemberEvents.forEach((event) => socket.on(event, refreshPage));
    socket.on('project.deleted', leaveDeletedProject);
    socket.on('project.member.removed', handleMemberRemoved);
    socket.connect();

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);

      socket.disconnect();
    };
  }, [currentUserId, includeCommentEvents, projectId, router]);

  return null;
}
