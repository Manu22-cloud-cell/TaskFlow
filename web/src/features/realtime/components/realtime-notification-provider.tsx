'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type Notification = {
  id: number;
  message: string;
};

type RealtimeNotificationContextValue = {
  notify: (message: string) => void;
};

export type RealtimeEventPayload = {
  actorId?: number;
  userId?: number;
  projectName?: string;
};

const RealtimeNotificationContext =
  createContext<RealtimeNotificationContextValue | null>(null);

export function getRealtimeNotificationMessage(
  event: string,
  payload: RealtimeEventPayload,
  currentUserId: number,
) {
  const messages: Record<string, string> = {
    'task.created': 'A new task was created.',
    'task.updated': 'A task was updated.',
    'task.moved': 'A task was moved.',
    'task.deleted': 'A task was deleted.',
    'comment.created': 'A new comment was added.',
    'comment.updated': 'A comment was updated.',
    'comment.deleted': 'A comment was deleted.',
    'project.updated': 'Project settings were updated.',
    'project.deleted': 'This project was deleted.',
  };

  if (event === 'project.member.added') {
    return payload.userId === currentUserId
      ? `You were added to ${payload.projectName ?? 'a project'}.`
      : `A member was added to ${payload.projectName ?? 'the project'}.`;
  }

  if (event === 'project.member.updated') {
    return payload.userId === currentUserId
      ? `Your role in ${payload.projectName ?? 'a project'} was updated.`
      : `A member role was updated in ${payload.projectName ?? 'the project'}.`;
  }

  if (event === 'project.member.removed') {
    return payload.userId === currentUserId
      ? `You no longer have access to ${payload.projectName ?? 'this project'}.`
      : `A member was removed from ${payload.projectName ?? 'the project'}.`;
  }

  return messages[event] ?? 'Project data was updated.';
}

export function RealtimeNotificationProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const notify = useCallback((message: string) => {
    const id = Date.now() + Math.random();

    setNotifications((current) => [...current, { id, message }]);

    window.setTimeout(() => {
      setNotifications((current) =>
        current.filter((notification) => notification.id !== id),
      );
    }, 4_000);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <RealtimeNotificationContext.Provider value={value}>
      {children}
      <aside
        aria-live="polite"
        className="fixed right-4 top-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
      >
        {notifications.map((notification) => (
          <div
            className="rounded-lg border border-indigo-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg"
            key={notification.id}
          >
            {notification.message}
          </div>
        ))}
      </aside>
    </RealtimeNotificationContext.Provider>
  );
}

export function useRealtimeNotifications() {
  const context = useContext(RealtimeNotificationContext);

  if (!context) {
    throw new Error(
      'useRealtimeNotifications must be used within RealtimeNotificationProvider',
    );
  }

  return context;
}
