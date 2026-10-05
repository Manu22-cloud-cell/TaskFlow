import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

describe('Firebase background worker', () => {
  let receive: (payload: any) => Promise<void>;
  let owner: number | null;
  let clients: { visibilityState: string }[];
  const showNotification = jest.fn();
  const payload = {
    data: { id: 'event-1', userId: '2', message: 'New task', href: '/tasks/4' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    owner = 2;
    clients = [];
    runInNewContext(
      readFileSync('web/public/firebase-messaging-sw.js', 'utf8'),
      {
        URL,
        importScripts: () => undefined,
        caches: {
          open: async () => ({
            match: async () => ({ json: async () => ({ userId: owner }) }),
          }),
        },
        firebase: {
          initializeApp: () => undefined,
          messaging: () => ({
            onBackgroundMessage: (callback: typeof receive) => {
              receive = callback;
            },
          }),
        },
        self: {
          location: {
            href: 'https://example.com/firebase-messaging-sw.js?config=%7B%7D',
            origin: 'https://example.com',
          },
          addEventListener: () => undefined,
          clients: { matchAll: async () => clients },
          registration: { showNotification },
        },
      },
    );
  });

  it('displays a background notification with the event ID and safe navigation data', async () => {
    await receive(payload);
    expect(showNotification).toHaveBeenCalledWith('TaskFlow', {
      body: 'New task',
      tag: 'taskflow:2:event-1',
      data: { href: '/tasks/4', userId: '2' },
    });
  });

  it('suppresses queued messages after logout or account switch', async () => {
    owner = null;
    await receive(payload);
    owner = 3;
    await receive(payload);
    expect(showNotification).not.toHaveBeenCalled();
  });

  it('leaves foreground notifications to Socket.IO', async () => {
    clients = [{ visibilityState: 'visible' }];
    await receive(payload);
    expect(showNotification).not.toHaveBeenCalled();
  });

  it('rejects external notification destinations', async () => {
    await receive({ data: { ...payload.data, href: 'https://other.example' } });
    expect(showNotification).not.toHaveBeenCalled();
  });
});
