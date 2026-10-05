'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import { clientApi } from '@/lib/client-api';

type DesktopEvent = {
  id: string;
  userId: number;
  actorId: number;
  message: string;
  href: string;
};

export function DesktopNotifications({ userId }: { userId: number }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState('Checking browser support…');
  const [supported, setSupported] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const enabledRef = useRef(false);
  const active = useRef(new Set<Notification>());
  const preferenceKey = `taskflow-desktop-notifications:${userId}`;

  useEffect(() => {
    let disposed = false;
    function syncPreference() {
      if (disposed) return;
      const available = window.isSecureContext && 'Notification' in window;
      setSupported(available);
      let saved = false;
      try {
        saved = localStorage.getItem(preferenceKey) === 'true';
      } catch {
        /* Storage may be disabled. */
      }
      const allowed =
        available && Notification.permission === 'granted' && saved;
      enabledRef.current = allowed;
      setEnabled(allowed);
      if (!allowed) {
        active.current.forEach((item) => item.close());
        active.current.clear();
      }
      setStatus(
        !available
          ? 'Desktop alerts need a supported browser and HTTPS (or localhost).'
          : Notification.permission === 'denied'
            ? 'Notifications are blocked. Allow them in your browser site settings.'
            : 'Alerts appear when this tab is hidden. Keep TaskFlow open and connected.',
      );
    }
    void Promise.resolve().then(syncPreference);
    window.addEventListener('focus', syncPreference);
    window.addEventListener('storage', syncPreference);
    const notifications = active.current;
    return () => {
      disposed = true;
      enabledRef.current = false;
      notifications.forEach((item) => item.close());
      notifications.clear();
      window.removeEventListener('focus', syncPreference);
      window.removeEventListener('storage', syncPreference);
    };
  }, [preferenceKey]);

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
    let retriedAuth = false;
    const seen = new Set<string>();

    socket.on('realtime.ready', () => {
      retriedAuth = false;
    });
    socket.on('disconnect', async (reason) => {
      if (reason !== 'io server disconnect' || retriedAuth || disposed) return;
      retriedAuth = true;
      try {
        // Uses the shared Axios refresh-and-retry flow if the access cookie expired.
        await clientApi.get('/projects', { params: { limit: 1 } });
        if (!disposed) socket.connect();
      } catch {
        /* Normal login/session handling remains responsible for authentication. */
      }
    });
    socket.on('notification.desktop', (event: DesktopEvent) => {
      if (
        !event ||
        event.userId !== userId ||
        event.actorId === userId ||
        seen.has(event.id)
      )
        return;
      seen.add(event.id);
      if (seen.size > 200) seen.delete(seen.values().next().value!);
      if (
        !enabledRef.current ||
        document.visibilityState !== 'hidden' ||
        !('Notification' in window) ||
        Notification.permission !== 'granted'
      )
        return;
      if (!/^\/(projects(?:\/\d+)?|tasks\/\d+)$/.test(event.href)) return;
      try {
        const notification = new Notification('TaskFlow', {
          body: event.message,
          tag: `taskflow:${userId}:${event.id}`,
        });
        active.current.add(notification);
        notification.onclose = () => active.current.delete(notification);
        notification.onclick = () => {
          notification.close();
          if (disposed) return;
          window.focus();
          router.push(event.href);
        };
        notification.onerror = () => {
          notification.close();
          setStatus(
            'Your browser or operating system could not display a desktop alert.',
          );
        };
      } catch {
        setStatus(
          'Desktop alerts are unavailable on this device. In-app notifications still work.',
        );
      }
    });
    socket.connect();
    return () => {
      disposed = true;
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, [router, userId]);

  async function toggle() {
    if (!supported) return;
    if (enabled) {
      enabledRef.current = false;
      setEnabled(false);
      active.current.forEach((item) => item.close());
      active.current.clear();
      try {
        localStorage.setItem(preferenceKey, 'false');
      } catch {
        /* Session-only preference. */
      }
      return;
    }
    setRequesting(true);
    try {
      const permission = await Notification.requestPermission();
      const allowed = permission === 'granted';
      enabledRef.current = allowed;
      setEnabled(allowed);
      try {
        localStorage.setItem(preferenceKey, String(allowed));
      } catch {
        /* Session-only preference. */
      }
      setStatus(
        allowed
          ? 'Desktop alerts enabled. Keep TaskFlow open in a background tab.'
          : permission === 'denied'
            ? 'Allow notifications in your browser site settings to enable desktop alerts.'
            : 'Permission was not granted. Click Enable desktop alerts to try again.',
      );
    } catch {
      setStatus('Unable to request notification permission in this browser.');
    } finally {
      setRequesting(false);
    }
  }

  return (
    <div className="border-t border-slate-100 px-5 py-2 text-sm sm:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3">
        <button
          className="button-secondary"
          type="button"
          disabled={!supported || requesting}
          onClick={toggle}
          aria-pressed={enabled}
        >
          {requesting
            ? 'Requesting permission…'
            : enabled
              ? 'Disable desktop alerts'
              : 'Enable desktop alerts'}
        </button>
        <span className="text-xs text-slate-500" role="status">
          {status}
        </span>
      </div>
    </div>
  );
}
