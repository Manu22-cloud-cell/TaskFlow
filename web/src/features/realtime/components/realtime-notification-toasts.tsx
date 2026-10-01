'use client';

import { useRealtimeNotificationStore } from '../stores/realtime-notification-store';

export function RealtimeNotificationToasts() {
  const notifications = useRealtimeNotificationStore(
    (state) => state.notifications,
  );
  const dismiss = useRealtimeNotificationStore((state) => state.dismiss);

  return (
    <aside
      aria-live="polite"
      className="fixed bottom-4 right-4 z-[100] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3"
    >
      {notifications
        .filter((notification) => notification.isToastVisible)
        .map((notification) => (
          <div
            className="flex items-center justify-between gap-3 rounded-lg border border-indigo-200 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-lg"
            key={notification.id}
          >
            <span>{notification.message}</span>
            <button
              aria-label="Dismiss notification"
              className="text-slate-400 transition hover:text-slate-700"
              onClick={() => dismiss(notification.id)}
              type="button"
            >
              ×
            </button>
          </div>
        ))}
    </aside>
  );
}
