'use client';

import Link from 'next/link';

import { useEffect, useId, useRef, useState } from 'react';

import { useRealtimeNotificationStore } from '../stores/realtime-notification-store';

export function NotificationCenter() {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const notifications = useRealtimeNotificationStore(
    (state) => state.notifications,
  );
  const markAsRead = useRealtimeNotificationStore((state) => state.markAsRead);
  const markAllAsRead = useRealtimeNotificationStore(
    (state) => state.markAllAsRead,
  );
  const clearAll = useRealtimeNotificationStore((state) => state.clearAll);
  const unreadCount = notifications.filter(
    (notification) => !notification.isRead,
  ).length;

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      if (
        event.target instanceof Node &&
        !containerRef.current?.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div
      className="relative"
      ref={containerRef}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget))
          setIsOpen(false);
      }}
    >
      <button
        aria-controls={isOpen ? panelId : undefined}
        aria-expanded={isOpen}
        aria-label={`Notifications, ${unreadCount} unread`}
        className="button-secondary notification-trigger relative focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
        onClick={() => setIsOpen((current) => !current)}
        ref={triggerRef}
        type="button"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          className="size-7 shrink-0"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className="absolute -right-2 -top-2 min-w-5 rounded-full bg-indigo-600 px-1 text-center text-xs leading-5 text-white"
          >
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <section
          aria-label="Recent notifications"
          className="absolute right-0 top-full mt-3 w-[min(24rem,calc(100vw-3rem))] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
          id={panelId}
        >
          <div className="border-b border-slate-100 p-4">
            <h2 className="font-semibold text-slate-900">Notifications</h2>
            <p className="mt-1 text-xs text-slate-500">
              Recent updates from this session · {unreadCount} unread
            </p>
            <div className="mt-3 flex gap-4 text-xs font-semibold">
              <button
                className="text-indigo-700 disabled:text-slate-400"
                disabled={unreadCount === 0}
                onClick={markAllAsRead}
                type="button"
              >
                Mark all as read
              </button>
              <button
                className="text-slate-600 disabled:text-slate-400"
                disabled={notifications.length === 0}
                onClick={clearAll}
                type="button"
              >
                Clear all
              </button>
            </div>
          </div>

          {notifications.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              No notifications yet.
            </p>
          ) : (
            <ul className="max-h-[60vh] overflow-y-auto divide-y divide-slate-100">
              {notifications.map((notification) => (
                <li
                  className={notification.isRead ? 'p-4' : 'bg-indigo-50 p-4'}
                  key={notification.id}
                >
                  <p className="text-sm text-slate-800">
                    {notification.href ? (
                      <Link
                        href={notification.href}
                        className="hover:underline"
                        onClick={() => {
                          markAsRead(notification.id);
                          setIsOpen(false);
                        }}
                      >
                        {notification.message}
                      </Link>
                    ) : (
                      notification.message
                    )}
                  </p>
                  <div className="mt-2 flex items-center justify-between gap-3 text-xs">
                    <time
                      className="text-slate-500"
                      dateTime={new Date(notification.createdAt).toISOString()}
                    >
                      {new Date(notification.createdAt).toLocaleString()}
                    </time>
                    {!notification.isRead && (
                      <button
                        className="shrink-0 font-semibold text-indigo-700"
                        onClick={() => markAsRead(notification.id)}
                        type="button"
                      >
                        Mark as read
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
