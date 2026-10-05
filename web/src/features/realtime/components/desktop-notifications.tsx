'use client';

import { useEffect, useRef, useState } from 'react';
import {
  bindPushOwner,
  disableFirebasePush,
  enableFirebasePush,
  firebaseMessaging,
} from '../firebase-push';
import { getClientApiError } from '@/lib/client-api';

export function DesktopNotifications({ userId }: { userId: number }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(true);
  const [supported, setSupported] = useState(false);
  const [status, setStatus] = useState('Checking browser push support…');
  const lifecycle = useRef<AbortController | null>(null);

  useEffect(() => {
    let disposed = false;
    const controller = new AbortController();
    lifecycle.current = controller;
    // Close the previous account's local delivery gate before registering this account.
    async function initialize() {
      try {
        await bindPushOwner(null);
        await firebaseMessaging();
        if (disposed) return;
        setSupported(true);
        if (
          Notification.permission === 'granted' &&
          localStorage.getItem(`taskflow-fcm-enabled:${userId}`) === 'true'
        ) {
          await enableFirebasePush(userId, controller.signal);
          if (!disposed) setEnabled(true);
        }
        if (!disposed)
          setStatus(
            Notification.permission === 'denied'
              ? 'Allow notifications in browser settings to enable push.'
              : 'Firebase delivers background alerts. Keep browser/OS notifications enabled.',
          );
      } catch (error) {
        if (!disposed)
          setStatus(
            error instanceof Error ? error.message : 'Push setup failed.',
          );
      } finally {
        if (!disposed) setBusy(false);
      }
    }
    void initialize();
    // Do not revoke registration on navigation or tab close: background push needs it.
    return () => {
      disposed = true;
      controller.abort();
    };
  }, [userId]);

  async function toggle() {
    setBusy(true);
    try {
      if (enabled) {
        await disableFirebasePush(userId);
        setEnabled(false);
        setStatus(
          'Browser push disabled. In-app notifications remain enabled.',
        );
      } else {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setStatus(
            'Notification permission was not granted. Check browser site settings.',
          );
          return;
        }
        await enableFirebasePush(userId, lifecycle.current?.signal);
        setEnabled(true);
        setStatus('Browser push enabled through Firebase.');
      }
    } catch (error) {
      setStatus(
        getClientApiError(
          error,
          error instanceof Error
            ? error.message
            : 'Unable to update browser push.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="border-t border-slate-100 px-5 py-2 text-sm sm:px-8">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-3">
        <button
          className="button-secondary"
          type="button"
          disabled={!supported || busy}
          onClick={toggle}
          aria-pressed={enabled}
        >
          {busy
            ? 'Setting up…'
            : enabled
              ? 'Disable browser push'
              : 'Enable browser push'}
        </button>
        <span className="text-xs text-slate-500" role="status">
          {status}
        </span>
      </div>
    </div>
  );
}
